from app.utils.security import hash_password, verify_password


def test_hash_password_does_not_return_plaintext():
    password = "correct horse battery staple"

    hashed_password = hash_password(password)

    assert hashed_password != password


def test_hash_password_generates_unique_hashes():
    password = "correct horse battery staple"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != second_hash


def test_verify_password_accepts_matching_password():
    password = "correct horse battery staple"

    hashed_password = hash_password(password)

    assert verify_password(password, hashed_password) is True


def test_verify_password_rejects_nonmatching_password():
    hashed_password = hash_password("correct horse battery staple")

    assert verify_password("wrong password", hashed_password) is False
