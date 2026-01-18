from verify_email import verify_email

payload = {
    "code": "798982"
}

response = verify_email(payload)
print(response)