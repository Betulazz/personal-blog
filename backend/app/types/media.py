from enum import StrEnum


class MediaKind(StrEnum):
    IMAGE = "image"
    AUDIO = "audio"


class MediaStorageStrategy(StrEnum):
    LOCAL = "local"
    S3 = "s3"
