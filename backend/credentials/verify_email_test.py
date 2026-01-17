from verify_email import verify_email

payload = {
    "code": "593381"
}

response = verify_email(payload)
print(response)