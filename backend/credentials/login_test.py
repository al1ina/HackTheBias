from login import login_user

payload = {
    "username": "johndoe",
    "password": "s!"
}

response = login_user(payload)
print(response)