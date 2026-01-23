# Workflow: Integrated Push Notifications

This workflow covers the registration of device tokens and testing of triggered push notifications (Orders, Reports, etc.).

### 1. Register Device Token
Before a user can receive notifications, their device must register a token.

- **Endpoint**: `POST /users/push-token`
- **Auth**: Bearer Token (JWT)
- **Body**:
  ```json
  { "token": "YOUR_FCM_DEVICE_TOKEN" }
  ```

### 2. Verify Registration (Optional)
Check the database to ensure the token is linked to the user:
```powershell
npx prisma studio
# Check 'UserDeviceToken' table
```

### 3. Test Triggered Notification
Trigger a real event that creates a notification:

#### A. Order Notification (User)
- Place an order as a user.
- **Expected**: User receives a "Order Placed" push notification.

#### B. Admin Alert (Reports)
- Report a product as a user/seller.
- **Expected**: All users with `isAdmin: true` receive a "New product report" push notification.

### 4. Cleanup & Diagnostics
- **Invalid Tokens**: The backend automatically deletes tokens from the DB if Firebase returns `not-registered`.
- **Manual Test**: Still available at `POST /dev/firebase/test` (Non-production only).

### Troubleshooting
- See backend logs for `📡 Sending push notification...` or `🛡️ Sending admin push...`.
- Ensure the app is correctly fetching the token from FCM.
