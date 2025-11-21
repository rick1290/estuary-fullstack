.PHONY: ngrok

ngrok:
	ngrok http 8000 --config ngrok.yml
