/**
 * DEPRECATED: Do NOT use this script anymore.
 * We now proxy Gemini calls through a Cloud Function and store the API key on the backend only.
 * Keeping this file only to avoid confusion for older docs; will be removed later.
 */

async function setGeminiApiKey(apiKey) {
  try {
    console.warn('This helper is deprecated. Store your key in Functions config or functions/.env.local instead.');
    // Import Firebase modules (assuming they're available in your app)
    const { ref, set, get } = await import('firebase/database');
    const { usersDB } = await import('./src/config/firebase-config');
    const { auth } = await import('./src/config/firebase-config');

    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error('❌ You must be logged in to set the API key');
      console.log('👉 Please log in to your account first, then run this script again');
      return;
    }

    // Validate API key format
    if (!apiKey || typeof apiKey !== 'string') {
      console.error('❌ Invalid API key format');
      return;
    }

    if (!apiKey.startsWith('AIzaSy')) {
  console.warn('⚠️ Warning: Gemini API keys usually start with "AIzaSy". Are you sure this is correct?');
      const confirm = window.confirm('The API key format looks unusual. Continue anyway?');
      if (!confirm) return;
    }

    // Reference to the config path
    const configRef = ref(usersDB, 'config/gemini/apiKey');

    // Check if key already exists
    const existingSnapshot = await get(configRef);
    if (existingSnapshot.exists()) {
      console.log('ℹ️ An API key already exists');
      const overwrite = window.confirm('An API key is already set. Do you want to overwrite it?');
      if (!overwrite) {
        console.log('❌ Operation cancelled');
        return;
      }
    }

    // Set the API key
    await set(configRef, apiKey);

    console.log('✅ SUCCESS! Gemini API key has been set in Firebase');
    console.log('📍 Path: /config/gemini/apiKey');
    console.log('🎉 Your chatbot is now ready to use!');
    console.log('💬 Look for the purple chat button in the bottom-right corner');
    
  } catch (error) {
    console.error('❌ Error setting API key:', error);
    console.error('Details:', error.message);
    
    if (error.code === 'PERMISSION_DENIED') {
      console.log('\n🔒 PERMISSION DENIED');
      console.log('This could mean:');
      console.log('1. Your user account doesn\'t have write permissions');
      console.log('2. You need to update Firebase security rules');
      console.log('3. You\'re not logged in as an admin');
      console.log('\nℹ️ Try adding the API key manually through Firebase Console instead');
    }
  }
}

// Interactive prompt version
async function promptForApiKey() {
  console.log('🤖 Gemini API Key Setup Assistant');
  console.log('═══════════════════════════════════════\n');
  
  const apiKey = window.prompt(
    'Enter your Gemini API key from AI Studio:\n\n' +
    '1. Go to https://aistudio.google.com/\n' +
    '2. Click "Get API Key"\n' +
    '3. Copy your key and paste it below\n\n' +
    'Your API key:'
  );

  if (!apiKey) {
    console.log('❌ Operation cancelled');
    return;
  }

  console.log('\n⏳ Setting API key...');
  await setGeminiApiKey(apiKey);
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
  console.log('%c🤖 Gemini Chatbot Setup Helper Loaded!', 'color: #667eea; font-size: 16px; font-weight: bold');
  console.log('%cRun: promptForApiKey()', 'color: #764ba2; font-size: 14px');
  console.log('%cor: setGeminiApiKey("YOUR_KEY_HERE")', 'color: #764ba2; font-size: 14px');
  
  // Make functions globally available
  window.setGeminiApiKey = setGeminiApiKey;
  window.promptForApiKey = promptForApiKey;
}

// Export for module usage
export { setGeminiApiKey, promptForApiKey };
