from fastapi import FastAPI, Header
import requests

app = FastAPI()



@app.get("/subjects")
def get_user_subjects():
  return {"test": 'hello-world'}