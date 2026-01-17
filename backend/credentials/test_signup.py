from signup import signup_user

test_payload = {
    "name": "John Doe",
    "username": "johndoe",
    "email": "boudyattia1@gmail.com",
    "confirm_email": "boudyattia1@gmail.com",
    "password": "StrongPassword123!"
}

response = signup_user(test_payload)
print(response)