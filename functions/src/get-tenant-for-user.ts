import { https } from "firebase-functions";
import admin = require("firebase-admin")
import { ListTenantsResult } from "firebase-admin/lib/auth/tenant-manager";

exports.getTenantForUser = https.onCall(async (data, ctx) => {
  let email = data.email;

  if (!email || email == "") {
    throw new https.HttpsError('invalid-argument', 'Email must be provided');
  }
  
  const initialized = admin.apps.some(app => app?.name === "[DEFAULT]");
  if (!initialized) {
    admin.initializeApp();
  }

  return getTenant("0", email).then((tenantId) => {
    if (!tenantId) {
      throw new https.HttpsError("not-found", "A user with that email doesn't exist");
    } else {
        return {
            "status": "success",
            "tenantId": tenantId
        }
    }
  });
});

function getTenant(nextPageToken: any, email: string): Promise<string | null | undefined>{
  return admin.auth().tenantManager().listTenants(100, nextPageToken)
    .then((result: ListTenantsResult) => {
      const tenantPromises = result.tenants.map(tenant => admin.auth().tenantManager().authForTenant(tenant.tenantId).listUsers(1000));
      return Promise.all(tenantPromises).then(arrayOfResponses => {
        for(let users of arrayOfResponses) {
          for(let user of users.users) {
            if (user.email == email) {
              return user.tenantId;
            }
          }
        }
        if (result.pageToken) {
          return getTenant(result.pageToken, email);
        }
        return null;
      })
    });
}