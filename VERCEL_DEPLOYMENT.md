# 🚀 TreeHole - Vercel Deployment Guide

## 📋 Quick Deploy Steps:

### Method 1: Direct GitHub Integration (Recommended)

1. **Visit Vercel Dashboard**
   - Go to: https://vercel.com/
   - Sign up/Login with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose: `samarabdelhameed/Treehole`

3. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   VITE_CONTRACT_ADDRESS_PAYMENT_SPLITTER=0x76d81731e26889Be3718BEB4d43e12C3692753b8
   VITE_CONTRACT_ADDRESS_TEST_TOKEN=0xB176c1FA7B3feC56cB23681B6E447A7AE60C5254
   VITE_NETWORK_CHAIN_ID=11155111
   VITE_NETWORK_NAME=sepolia
   VITE_DEBUG_MODE=false
   VITE_LOG_LEVEL=info
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Get your live URL!

### Method 2: Manual Deploy

1. **Build Project Locally**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Upload to Vercel**
   - Drag and drop the `frontend/dist` folder to vercel.com
   - Configure domain name
   - Done!

## 🔗 Expected Live URL Format:
`https://treehole-[random-string].vercel.app`

## ✅ Deployment Checklist:

- [x] Project built successfully
- [x] vercel.json configuration added
- [x] Production environment variables set
- [x] GitHub repository updated
- [x] Build artifacts generated
- [ ] Vercel account setup (you need to do this)
- [ ] Project deployed
- [ ] Live URL tested

## 🎯 After Deployment:

1. **Test the live site**:
   - Connect MetaMask wallet
   - Claim test tokens
   - Start timer
   - Test payment functionality
   - Test voice chat

2. **Update README with live URL**

3. **Share the link**!

## 🔧 Troubleshooting:

### Build Issues:
- Ensure all dependencies are in package.json
- Check that build command works locally
- Verify environment variables are set

### Runtime Issues:
- Check browser console for errors
- Ensure MetaMask is installed
- Verify contract addresses are correct
- Test on Sepolia testnet

## 📞 Support:
If you encounter issues, check:
- Vercel build logs
- Browser developer console
- Network tab for failed requests

---

**Ready to deploy! Follow Method 1 for the easiest deployment.** 🚀