// lib/firebase.js
// Re-export Firebase instances from main app config

import { db, storage, auth } from '../../src/lib/firebase';

export { db, storage, auth };
export default null;
