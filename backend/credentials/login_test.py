from login import login_user

payload = {
    "username": "johndoe",
    "password": "StrongPassword123!"
}

response = login_user(payload)
print(response)