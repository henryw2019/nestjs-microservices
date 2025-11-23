import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app/app.module';

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/ (GET)', () => {
        return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
    });

    describe('Chain API', () => {
        it('/chain/address-balance (GET)', () => {
            return request(app.getHttpServer())
                .get('/chain/address-balance')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('/chain/block (GET)', () => {
            return request(app.getHttpServer())
                .get('/chain/block')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('/chain/erc20-transfer (GET)', () => {
            return request(app.getHttpServer())
                .get('/chain/erc20-transfer')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('/chain/event-log (GET)', () => {
            return request(app.getHttpServer())
                .get('/chain/event-log')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('/chain/token-meta (GET)', () => {
            return request(app.getHttpServer())
                .get('/chain/token-meta')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('data');
                });
        });

        it('/chain/transaction (GET)', () => {
            return request(app.getHttpServer())
                .get('/chain/transaction')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('data');
                });
        });
    });
});
