# apps/accounts/serializers.py
from __future__ import annotations

from typing import Any

from django.contrib.auth.models import Group, Permission
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AGENCY_ADMIN, Agency, AgencyBranch, User, UserProfile


class BaseAgencySerializer(serializers.ModelSerializer):
    """Lightweight serializer used during onboarding to avoid circular imports."""

    class Meta:
        model = Agency
        fields = ["id", "agency_name", "agency_code"]


class AgencyBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyBranch
        fields = ["id", "branch_name", "branch_code", "address", "city", "agency"]
        read_only_fields = ["agency"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "codename"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ["id", "name", "permissions"]


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["phone_number", "profile_picture", "bio"]


class AgencySerializer(serializers.ModelSerializer):
    branches = AgencyBranchSerializer(many=True, read_only=True)
    
    class Meta:
        model = Agency
        fields = ["id", "agency_name", "agency_code", "mpesa_shortcode", "branches"]


class AgencyOnboardingSerializer(serializers.Serializer):
    """Create Agency + initial Admin user atomically."""

    agency_name = serializers.CharField(max_length=200, write_only=True)
    agency_code = serializers.CharField(max_length=50, write_only=True)
    first_name = serializers.CharField(max_length=150, write_only=True)
    last_name = serializers.CharField(max_length=150, write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        validators=[django_validate_password],
    )

    agency = BaseAgencySerializer(read_only=True)
    admin_user = serializers.SerializerMethodField(read_only=True)

    def get_admin_user(self, obj: dict[str, Any]) -> dict[str, Any] | None:
        user = obj.get("admin_user") if isinstance(obj, dict) else None
        if not user:
            return None
        return {
            "id": user.pk,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

    def validate_agency_code(self, value: str) -> str:
        if Agency.objects.filter(agency_code__iexact=value).exists():
            raise serializers.ValidationError("An agency with this code already exists.")
        return value

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data: dict[str, Any]) -> dict[str, Any]:
        from django.core.exceptions import ObjectDoesNotExist

        try:
            admin_group = Group.objects.get(name=AGENCY_ADMIN)
        except ObjectDoesNotExist:
            raise serializers.ValidationError(
                {"internal": "AGENCY_ADMIN group is not configured."}
            )

        with transaction.atomic():
            agency = Agency.objects.create(
                agency_name=validated_data["agency_name"],
                agency_code=validated_data["agency_code"],
            )

            admin_user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data["first_name"],
                last_name=validated_data["last_name"],
                agency=agency,
                is_staff=True,
                is_active=True,
            )
            admin_user.groups.add(admin_group)
            return {"agency": agency, "admin_user": admin_user}


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user: User):
        token = super().get_token(user)
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["roles"] = [g.name for g in user.groups.all()]
        return token


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, validators=[django_validate_password]
    )

    def validate_old_password(self, value: str) -> str:
        user: User = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs: Any) -> User:
        user: User = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    roles = serializers.StringRelatedField(source="groups", many=True, read_only=True)
    password = serializers.CharField(
        write_only=True, required=False, validators=[django_validate_password]
    )
    groups = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Group.objects.all(), required=False, write_only=True
    )
    agency_detail = AgencySerializer(source="agency", read_only=True)
    branch_detail = AgencyBranchSerializer(source="branch", read_only=True)  # NEW: Nested branch details for smooth frontend display

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "password",
            "agency",
            "branch",
            "manager",
            "profile",
            "groups",
            "roles",
            "agency_detail",
            "branch_detail",  # NEW: Include in fields
        ]
        read_only_fields = ["id", "profile", "roles", "agency_detail", "branch_detail"]  # NEW: Add to read_only
        extra_kwargs = {
            "agency": {"write_only": True},
            "branch": {"write_only": True},
            "manager": {"write_only": True},
        }

    def create(self, validated_data: dict[str, Any]) -> User:
        groups = validated_data.pop("groups", [])
        password = validated_data.pop("password", None)
        validated_data.setdefault("is_active", True)

        if not password:
            raise serializers.ValidationError(
                {"password": "Password is required when creating a user."}
            )

        user = User.objects.create_user(password=password, **validated_data)
        if groups:
            user.groups.set(groups)
        return user

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        password = validated_data.pop("password", None)
        groups = validated_data.pop("groups", None)

        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
        if groups is not None:
            instance.groups.set(groups)
        instance.save()
        return instance