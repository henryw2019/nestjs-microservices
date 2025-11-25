import 'dotenv/config';

const config = {
    schema: 'schema.prisma',
    datasource: {
        url: process.env.INDEXER_DATABASE_URL || process.env.DATABASE_URL || '',
    },
};

export default config;
