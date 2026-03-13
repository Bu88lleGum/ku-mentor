from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    EMPLOYER = "employer"
    ADMIN = "admin"

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class CourseStatus(str, Enum):
    INTERESTED = "interested"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"