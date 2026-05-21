"""Загрузка одного файла (base64) в S3 и возврат CDN-URL."""
import json
import base64
import os
import boto3


def handler(event: dict, context) -> dict:
    """Принимает один файл в base64, сохраняет в S3, возвращает URL."""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    raw_body = event.get("body") or "{}"
    body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body

    b64 = body.get("data", "")
    filename = body.get("filename", "file.webp")
    folder = body.get("folder", "applications")

    if not b64:
        return {"statusCode": 400, "headers": cors_headers,
                "body": json.dumps({"error": "data required"}, ensure_ascii=False)}

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webp"
    ct_map = {"webp": "image/webp", "jpg": "image/jpeg", "jpeg": "image/jpeg",
               "png": "image/png", "pdf": "application/pdf"}
    content_type = ct_map.get(ext, f"image/{ext}")

    file_data = base64.b64decode(b64)

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    s3_key = f"{folder}/{filename}"
    s3.put_object(Bucket="files", Key=s3_key, Body=file_data, ContentType=content_type)

    access_key = os.environ["AWS_ACCESS_KEY_ID"]
    url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{s3_key}"

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"url": url}, ensure_ascii=False),
    }
