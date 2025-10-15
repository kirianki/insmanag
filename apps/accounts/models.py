from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.core.models import UUIDModel, TimestampedModel

# --- Role Names as Constants ---
AGENCY_ADMIN = 'Agency Admin'
BRANCH_MANAGER = 'Branch Manager'
AGENT = 'Agent'

class CustomUserManager(UserManager):
    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("agency", None)
        return self._create_user(email, password, **extra_fields)

class Agency(UUIDModel, TimestampedModel):
    agency_name = models.CharField(max_length=200)
    agency_code = models.CharField(max_length=50, unique=True)
    mpesa_shortcode = models.CharField(max_length=20, blank=True, null=True)
    mpesa_credentials_encrypted = models.TextField(blank=True, null=True)
    class Meta:
        verbose_name_plural = "Agencies"
    def __str__(self):
        return self.agency_name

class AgencyBranch(UUIDModel, TimestampedModel):
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="branches")
    branch_name = models.CharField(max_length=200)
    branch_code = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    def __str__(self):
        return f"{self.agency.agency_name} - {self.branch_name}"

class User(AbstractUser, UUIDModel):
    username = None
    email = models.EmailField(unique=True)
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="users", null=True, blank=True)
    branch = models.ForeignKey(AgencyBranch, on_delete=models.SET_NULL, related_name="staff", null=True, blank=True)
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="team_members",
        related_query_name="team_member", # --- ADDED THIS LINE ---
        null=True,
        blank=True
    )
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = CustomUserManager()
    
    class Meta:
        ordering = ['email']
        
    def __str__(self):
        return self.email
        
    @property
    def is_agency_admin(self):
        return self.groups.filter(name=AGENCY_ADMIN).exists()

    @property
    def is_branch_manager(self):
        return self.groups.filter(name=BRANCH_MANAGER).exists()

    @property
    def is_agent(self):
        return self.groups.filter(name=AGENT).exists()

class UserProfile(UUIDModel, TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    bio = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Profile for {self.user.email}"

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    instance.profile.save()