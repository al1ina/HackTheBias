from signup import signup_user

test_payload = {
    "name": "John Doe",
    "username": "boudyattia",
    "email": "boudyTTV@gmail.com",
    "confirm_email": "boudyTTV@gmail.com",
    "password": "TEST"
}

response = signup_user(test_payload)
print(response)