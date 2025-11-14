FROM python:3.11.5-bullseye

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install Node.js for MJML
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g mjml

RUN pip install --upgrade pip

COPY . /app/

RUN mkdir -p /app/staticfiles/

RUN pip install -r requirements.txt  

EXPOSE 8000

CMD ["uvicorn", "estuary.asgi:application", "--host", "0.0.0.0"]
