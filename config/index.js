import {
    config
} from 'dotenv';

const {
    parsed
} = config();


export const {
    PROD,
    SECRET,
    PORT,
    // IN_PROD = PROD === 'prod',
    BASE_URL = `http://localhost:${PORT}`,
    FRONTEND_URL=`http://localhost:3000`,
    GMAIL_USER,
    GMAIL_PASSWORD,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL,
    GOOGLE_REFRESH_TOKEN
} = parsed;
