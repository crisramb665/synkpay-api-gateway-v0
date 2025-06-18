up:
	docker-compose up --build

down:
	docker-compose down

logs:
	docker-compose logs -f --tail=100

restart:
	docker-compose down && docker-compose up --build