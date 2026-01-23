import { Module, Global, Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { PushNotificationService } from './push-notification.service';
import { FirebaseTestController } from './firebase-test.controller';
import { PrismaModule } from '../prisma/prisma.module';
import * as fs from 'fs';

const firebaseAdminProvider: Provider = {
    provide: 'FIREBASE_ADMIN',
    useFactory: () => {
        if (admin.apps.length === 0) {
            try {
                // Try to find the service account file in multiple locations
                const possiblePaths = [
                    process.env.FIREBASE_CREDENTIAL_PATH,
                    path.join(process.cwd(), 'firebase-service-account.json'),
                    path.join(process.cwd(), 'src/config/firebase-service-account.json'),
                    path.join(process.cwd(), 'dist/config/firebase-service-account.json'),
                ].filter(Boolean) as string[];

                let serviceAccount: any = null;
                let usedPath = '';

                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        try {
                            serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
                            usedPath = p;
                            break;
                        } catch (e) {
                            console.warn(`Found file at ${p} but failed to parse:`, e.message);
                        }
                    }
                }

                if (!serviceAccount) {
                    console.warn('⚠️ Firebase Service Account file not found. Push notifications will be MOCKED.');
                    return createMockAdmin();
                }

                console.log(`✅ Initializing Firebase Admin with: ${usedPath}`);
                console.log(`🔥 Firebase Realtime DB URL: ${process.env.FIREBASE_DATABASE_URL}`);

                return admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: process.env.FIREBASE_DATABASE_URL,
                });
            } catch (error) {
                console.error('❌ Firebase initialization error:', error.message);
                return createMockAdmin();
            }
        }
        return admin.app();
    },
};

function createMockAdmin() {
    return {
        messaging: () => ({
            send: async () => { console.warn('⚠️ Mock Push: send() called (No Firebase Config)'); return 'mock-id'; },
            sendEachForMulticast: async () => {
                console.warn('⚠️ Mock Push: sendEachForMulticast() called (No Firebase Config)');
                return { successCount: 0, failureCount: 0, responses: [] };
            },
        }),
    };
}

@Global()
@Module({
    imports: [PrismaModule],
    providers: [firebaseAdminProvider, PushNotificationService],
    controllers: [FirebaseTestController],
    exports: [firebaseAdminProvider, PushNotificationService],
})
export class FirebaseModule { }
