import { Tenant } from "firebase-admin/lib/auth/tenant";
import { https } from "firebase-functions";
import admin = require("firebase-admin")
import { HttpsError, UserRecord } from "firebase-functions/v1/auth";
import { ListTenantsResult } from "firebase-admin/lib/auth/tenant-manager";

exports.createTenant = https.onCall(async (data, ctx) => {
  let company = data.company;
  let email = data.email;
  let password = data.password;

  if (!company || company == "") {
    throw new https.HttpsError('invalid-argument', 'Company name must be provided');
  }
  if (!email || email == "") {
    throw new https.HttpsError('invalid-argument', 'Email must be provided');
  }
  if (!password || password == "") {
    throw new https.HttpsError('invalid-argument', 'Password must be provided');
  }
  
  const initialized = admin.apps.some(app => app?.name === "[DEFAULT]");
  if (!initialized) {
    admin.initializeApp();
  }

  return doesUserExist("0", email).then((exists) => {
    console.log("exists?", exists);
    if (exists) {
      console.log(8);
      throw new https.HttpsError('already-exists', 'A user with that email already exists');
    } else {
      return admin.auth().tenantManager().createTenant({
        displayName: company,
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false, // Email link sign-in enabled.
        }
      })
      .then((createdTenant: Tenant) => {
        console.log('Successfully created new tenant:', createdTenant.tenantId);
        const tenantAuth = admin.auth().tenantManager().authForTenant(createdTenant.tenantId);
        return tenantAuth.createUser({
          email: email,
          emailVerified: false,
          password: password,
        })
        .then((userRecord: UserRecord) => {
          // See the UserRecord reference documentation to learn more.
          console.log('Successfully created new user:', userRecord.uid);
          // Tenant ID will be reflected in userRecord.tenantId.
          return {
            "status": "success",
            "tenantId": createdTenant.tenantId
          }
        })
        .catch((error: HttpsError) => {
          console.log('Error creating new user:', error);
          throw error;
        });
      })
      .catch((error: HttpsError) => {
        console.log('Error creating new tenant:', error);
          throw error;
      });
    }
  });
});

function doesUserExist(nextPageToken: any, email: string): Promise<boolean> {
  return admin.auth().tenantManager().listTenants(100, nextPageToken)
    .then((result: ListTenantsResult) => {
      const tenantPromises = result.tenants.map(tenant => admin.auth().tenantManager().authForTenant(tenant.tenantId).listUsers(1000));
      return Promise.all(tenantPromises).then(arrayOfResponses => {
        for(let users of arrayOfResponses) {
          for(let user of users.users) {
            if (user.email == email) {
              return true;
            }
          }
        }
        if (result.pageToken) {
          return doesUserExist(result.pageToken, email);
        }
        return false;
      })
    });
}