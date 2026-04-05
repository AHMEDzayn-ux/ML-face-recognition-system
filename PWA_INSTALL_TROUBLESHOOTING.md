# PWA Installation Troubleshooting Guide

## ❌ Problem: "Installing..." but app doesn't install

This is usually caused by one of these issues:

### 1. **HTTPS Requirement** ⚠️ (MOST COMMON)
PWA installation ONLY works on HTTPS (or localhost for testing).

**Check your URL:**
- ✅ Works: `https://yourdomain.com`
- ✅ Works: `http://localhost:3000`
- ❌ Fails: `http://10.0.0.1:3000` (HTTP on network)
- ❌ Fails: `http://192.168.x.x:3000` (HTTP on network)

**Solution for ngrok:**
Make sure you're using the HTTPS ngrok URL:
- ✅ `https://xxxxxxx-ngrok-free.dev` (works)
- ❌ `http://localhost:8000` (on different machine - won't work)

### 2. **Check Browser Console for Errors**

Open Chrome DevTools on mobile:
1. Open your app on Android
2. Press `F12` or `Ctrl+Shift+I` (or Settings → More tools → Developer tools)
3. Go to **Console** tab
4. Look for messages like:
   - `✓ Service Worker registered`
   - `✓ beforeinstallprompt event fired`
   - `✗ Service Worker registration failed`
   - `✗ Installation error`

### 3. **Service Worker Issues**

Check the **Application** tab in Chrome DevTools:
1. Go to **Application** → **Service Workers**
2. Look for `/sw.js`
3. Should see status: **activated and running**

If it says "redundant":
- Clear browser cache (Settings → Clear browsing data)
- Restart the app
- Try again

### 4. **Manifest Issues**

In DevTools, go to **Application** → **Manifest**:
- Should show `manifest.json` loaded
- Check for any red warning icons
- Should have proper icons section

### 5. **Browser Support**

Not all Android browsers support PWA installation:
- ✅ **Chrome** - Full support
- ✅ **Edge** - Full support
- ✅ **Samsung Internet** - Full support
- ⚠️ **Firefox** - Limited support
- ❌ **Safari on iOS** - No install support (add to home screen only)

---

## ✅ How to Test Locally (RECOMMENDED)

### **On Laptop:**
```bash
cd pwa-dashboard
npm run build
npm start
```

Then open:
- `http://localhost:3000` - Should work for testing

### **Key checklist before testing:**

1. **Check Service Worker** (Chrome DevTools → Application):
   - Status should be "activated and running"
   - URL should be `/sw.js`

2. **Check Manifest** (Chrome DevTools → Application):
   - Should load without errors
   - Icons should be found

3. **Check Installation Criteria**:
   - Domain must be HTTPS (or localhost)
   - Service Worker must be registered
   - Manifest must be valid
   - Must visit site for 30 seconds minimum

4. **Clear Cache First**:
   - Settings → Clear browsing data
   - Check "Service workers"
   - Check "Cached images and files"
   - Click Clear

---

## 🔧 Mobile Testing on Vercel

When deployed to Vercel (HTTPS), installation should work:

1. Go to your Vercel URL on Android phone
2. Wait 30 seconds
3. Blue "Install App" button should appear
4. Click "Install Now"
5. Check home screen for new app icon

---

## 📱 Debugging Commands

Open mobile DevTools and paste these in Console:

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
  regs.forEach(reg => console.log('✓ Registered:', reg.scope));
});

// Check if app is running as PWA
console.log('Is PWA?', window.matchMedia('(display-mode: standalone)').matches);
console.log('Is iOS PWA?', navigator.standalone === true);

// Check manifest
fetch('/manifest.json').then(r => r.json()).then(m => console.log('Manifest:', m));
```

---

## 🚀 Quick Fix Checklist

- [ ] Make sure you're on **HTTPS** (or localhost)
- [ ] Clear browser cache completely
- [ ] Force refresh (Ctrl+Shift+R)
- [ ] Check DevTools Console for errors
- [ ] Check DevTools → Application → Service Workers → Status is "activated"
- [ ] Try without VPN/Proxy
- [ ] Try different Android phone if possible
- [ ] Wait 30+ seconds on the page before clicking install
- [ ] Try different browser (Chrome is most reliable)

---

## ⚠️ Known Issues & Workarounds

### **Issue**: Install button doesn't appear at all
**Solution**:
1. Check you're on HTTPS
2. Clear cache: Settings → Apps → Chrome → Storage → Clear cache
3. Try incognito mode
4. Wait full 30 seconds before checking

### **Issue**: "Installing..." shows but nothing happens
**Solution**:
1. Check browser console (F12) for specific errors
2. Try different Wi-Fi network
3. Disable VPN/Proxy
4. Try Chrome instead of other browsers

### **Issue**: Works on laptop but not on mobile
**Solution**:
1. Make sure mobile is on same network as laptop
2. Check URL is HTTPS or localhost (not IP address over HTTP)
3. Check mobile browser is Chrome/Edge/Samsung Internet
4. Try ngrok HTTPS URL instead of ngrok HTTP

---

## 📋 Working Configuration

Here's what should be in place:

✅ `public/manifest.json` - Complete with icons
✅ `public/sw.js` - Service worker file
✅ `public/icon-192.png` - Exists and proper size
✅ `public/icon-512.png` - Exists and proper size
✅ `next.config.js` - PWA headers configured
✅ `vercel.json` - PWA headers for Vercel
✅ Server responding with HTTPS

If all are in place, installation should work!

---

## 🆘 Still Not Working?

1. Open DevTools Console and run debugging commands above
2. Check exact error message
3. Try on different phone/browser
4. Check if you need to wait longer for "beforeinstallprompt" event
5. Verify manifest.json is valid JSON (no syntax errors)
