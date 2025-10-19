# نشر سريع للعقود على Sepolia

## الخطوات السريعة:

### 1. تحضير البيئة
```bash
# تثبيت المتطلبات
npm install ethers

# أو إذا كنت تستخدم yarn
yarn add ethers
```

### 2. إعداد المتغيرات
قم بتحديث `deploy-script.js`:
```javascript
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY'; // احذف هذا بعد النشر!
```

### 3. الحصول على Sepolia ETH
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)
- تحتاج على الأقل 0.01 ETH

### 4. تشغيل النشر
```bash
node deploy-script.js
```

### 5. التحقق من النشر
```bash
node verify-contracts.js
```

## النتيجة المتوقعة:
```
🚀 Starting contract deployment to Sepolia...
📍 Deploying from address: 0x...
💰 Balance: 0.05 ETH
📄 Deploying TestToken...
✅ TestToken deployed at: 0x...
📄 Deploying PaymentSplitter...
✅ PaymentSplitter deployed at: 0x...
📝 Updated frontend/src/web3/contracts.ts with new addresses
🎉 Deployment completed successfully!
```

## بعد النشر:
1. ✅ العقود منشورة على Sepolia
2. ✅ العناوين محدثة في التطبيق تلقائياً
3. ✅ يمكنك استخدام التطبيق مع البيانات الحقيقية
4. ✅ احذف المفتاح الخاص من الملف!

## استكشاف الأخطاء:
- **"insufficient funds"**: تحتاج المزيد من Sepolia ETH
- **"nonce too high"**: أعد تشغيل MetaMask
- **"gas estimation failed"**: تحقق من الكود والمعاملات