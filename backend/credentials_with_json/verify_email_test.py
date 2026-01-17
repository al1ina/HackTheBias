from verify_email import verify_email

payload = {
    "code": "558899"
}

response = verify_email(payload)
print(response)