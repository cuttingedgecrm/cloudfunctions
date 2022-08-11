import { Tenant } from "firebase-admin/lib/auth/tenant";
import { UserInfo } from "firebase-admin/lib/auth/user-record";
import { Request, Response } from "firebase-functions/v1";

const functions = require('firebase-functions');
const admin = require('firebase-admin');


exports.newTenant = functions.https.onRequest(async (req: Request, res: Response) => {
  let company = req.body.company;
  let email = req.body.email;
  let password = req.body.password;

  admin.initializeApp();

  admin.auth().tenantManager().createTenant({
    displayName: company,
    emailSignInConfig: {
      enabled: true,
      passwordRequired: false, // Email link sign-in enabled.
    }
  })
  .then((createdTenant: Tenant) => {
    console.log('Successfully created new tenant:', createdTenant.tenantId);
    const tenantAuth = admin.auth().tenantManager().authForTenant(createdTenant.tenantId);
    tenantAuth.createUser({
      email: email,
      emailVerified: false,
      password: password,
    })
    .then((userRecord: UserInfo) => {
      // See the UserRecord reference documentation to learn more.
      console.log('Successfully created new user:', userRecord.uid);
      // Tenant ID will be reflected in userRecord.tenantId.
    })
    .catch((error: any) => {
      console.log('Error creating new user:', error);
    });
  })
  .catch((error: any) => {
    // Handle error.
  });
    res.send(`Hello ${req.query.name || req.body.name || 'World'}!`);
});
