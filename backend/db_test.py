import mysql.connector
from mysql.connector import Error

try:
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Omar2011",
        database="silent_speak_db",
        port=3306
    )

    if connection.is_connected():
        print("Connected to database")

        cursor = connection.cursor()
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()

        print("Tables in database:")
        for table in tables:
            print(table[0])

except Error as e:
    print("Error while connecting to MySQL:", e)

finally:
    if 'cursor' in locals():
        cursor.close()
    if 'connection' in locals() and connection.is_connected():
        connection.close()
        print("Connection closed")