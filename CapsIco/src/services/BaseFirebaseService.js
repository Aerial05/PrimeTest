export class BaseFirebaseService {
  constructor({ app, auth, database }) {
    if (!app || !auth) {
      throw new Error('BaseFirebaseService requires Firebase app and auth instances.');
    }
    this._app = app;
    this._auth = auth;
    this._database = database;
  }

  get app() {
    return this._app;
  }

  get auth() {
    return this._auth;
  }

  get database() {
    return this._database;
  }
}

export default BaseFirebaseService;
