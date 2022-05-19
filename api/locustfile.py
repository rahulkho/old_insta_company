import random
from locust import HttpUser, task, between


class QuickstartUser(HttpUser):
    wait_time = between(5, 9)

    @task
    def on_start(self):
        self.client.post("/v1/public/posts",
                         {
                             "nextPageId": 0
                         })
