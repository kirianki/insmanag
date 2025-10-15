# apps/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Agency, AgencyBranch, User, UserProfile # Import UserProfile

@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ('agency_name', 'agency_code', 'created_at')
    search_fields = ('agency_name', 'agency_code')

@admin.register(AgencyBranch)
class AgencyBranchAdmin(admin.ModelAdmin):
    list_display = ('branch_name', 'agency', 'city', 'created_at')
    search_fields = ('branch_name', 'agency__agency_name')
    list_filter = ('agency',)

# --- NEW: Inline admin for the UserProfile model ---
# This allows us to edit the UserProfile directly from the User admin page.
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False  # The profile should not be deletable separately from the user
    verbose_name_plural = 'Profile'
    fk_name = 'user'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Define the admin pages for the custom User model.
    Includes an inline for managing the user's profile.
    """
    # --- ADDED: The inline for UserProfile ---
    inlines = (UserProfileInline,)

    ordering = ('email',)
    list_display = ('email', 'first_name', 'last_name', 'agency', 'is_staff', 'get_roles')
    list_filter = ('is_staff', 'is_superuser', 'groups', 'agency')
    search_fields = ('first_name', 'last_name', 'email', 'agency__agency_name')
    
    # Custom method to display roles in list_display
    def get_roles(self, obj):
        return ", ".join([g.name for g in obj.groups.all()])
    get_roles.short_description = 'Roles'

    # Fieldsets for editing an existing user
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        ("Agency Info", {'fields': ('agency', 'branch', 'manager')}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    
    # Fieldsets for creating a new user (profile will be added after creation)
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password", "password2"),
            },
        ),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        ("Agency Info", {'fields': ('agency', 'branch', 'manager')}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups")}),
    )
    
    filter_horizontal = ('groups', 'user_permissions',)

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)