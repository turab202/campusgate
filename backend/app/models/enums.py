import enum


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    STAFF = "STAFF"
    GATE_OFFICER = "GATE_OFFICER"
    ADMIN = "ADMIN"


class DeviceType(str, enum.Enum):
    LAPTOP = "LAPTOP"
    TABLET = "TABLET"
    PHONE = "PHONE"
    CAMERA = "CAMERA"
    MONITOR = "MONITOR"
    OTHER = "OTHER"


class DeviceStatus(str, enum.Enum):
    INSIDE_CAMPUS = "INSIDE_CAMPUS"
    OUTSIDE_CAMPUS = "OUTSIDE_CAMPUS"
    LOST = "LOST"
    REPORTED_LOST = "REPORTED_LOST"


class MovementType(str, enum.Enum):
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"


class IncidentType(str, enum.Enum):
    LOST_DEVICE = "LOST_DEVICE"
    OWNER_MISMATCH = "OWNER_MISMATCH"
    UNAUTHORIZED_EXIT = "UNAUTHORIZED_EXIT"
    OTHER = "OTHER"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class IdentificationType(str, enum.Enum):
    NATIONAL_ID = "NATIONAL_ID"
    PASSPORT = "PASSPORT"
    DRIVER_LICENSE = "DRIVER_LICENSE"
    OTHER = "OTHER"


class VisitStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class TemporaryExitRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    COMPLETED = "COMPLETED"
