from verify_email import verify_email

payload = {
    "code": "456474"
}

response = verify_email(payload)
print(response)