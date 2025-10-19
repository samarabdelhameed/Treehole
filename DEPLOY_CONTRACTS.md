# نشر العقود الذكية على Sepolia

## المشكلة الحالية

الخطأ `could not decode result data (value="0x", info={ "method": "balanceOf", "signature": "balanceOf(address)" }, code=BAD_DATA` يعني أن العقد الذكي غير موجود على العنوان المحدد.

## الحل: نشر العقود

### 1. التحقق من وجود العقود

```bash
# تشغيل أداة التشخيص في التطبيق
# Settings → Run System Diagnostics
```

### 2. نشر العقود باستخدام Foundry

```bash
# تأكد من وجود Foundry
forge --version

# إذا لم يكن مثبتاً
curl -L https://foundry.paradigm.xyz | bash
foundryup

# انتقل إلى مجلد العقود
cd contracts

# نشر TestToken
forge create TestToken \
  --rpc-url https://sepolia.infura.io/v3/YOUR_INFURA_KEY \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args

# نشر PaymentSplitter
forge create PaymentSplitter \
  --rpc-url https://sepolia.infura.io/v3/YOUR_INFURA_KEY \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args TOKEN_ADDRESS
```

### 3. تحديث عناوين العقود

بعد النشر، حدث الملف `frontend/src/web3/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  testToken: 'NEW_TOKEN_ADDRESS_HERE',
  paymentSplitter: 'NEW_PAYMENT_SPLITTER_ADDRESS_HERE',
};
```

### 4. استخدام عقود جاهزة (بديل سريع)

إذا كنت تريد اختبار سريع، يمكنك استخدام عقود ERC20 موجودة على Sepolia:

```typescript
// في frontend/src/web3/contracts.ts
export const CONTRACT_ADDRESSES = {
  // USDC على Sepolia (مثال)
  testToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  // أو أي عقد ERC20 آخر على Sepolia
  paymentSplitter: '0x0000000000000000000000000000000000000000', // تعطيل مؤقتاً
};
```

### 5. الحصول على Sepolia ETH

للنشر والمعاملات، تحتاج Sepolia ETH:

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Chainlink Sepolia Faucet](https://faucets.chain.link/sepolia)

### 6. التحقق من النشر

```bash
# التحقق من العقد على Etherscan
https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

# أو استخدام cast
cast code YOUR_CONTRACT_ADDRESS --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
```

## حل سريع للاختبار

إذا كنت تريد اختبار التطبيق بسرعة دون نشر عقود:

1. **استخدم وضع المحاكاة:**
   ```typescript
   // في frontend/src/web3/faucet.ts
   export async function claimFaucet(tokenContract: Contract, recipientAddress: string): Promise<any> {
     // محاكاة نجح العملية
     return { hash: '0x' + Math.random().toString(16).substr(2, 64) };
   }
   ```

2. **أو استخدم Local Hardhat Network:**
   ```bash
   npx hardhat node
   # ثم غير RPC URL إلى http://localhost:8545
   ```

## نصائح مهمة

1. **احفظ المفاتيح الخاصة بأمان** - لا تشاركها أبداً
2. **استخدم .env للمفاتيح الحساسة**
3. **تحقق من العناوين قبل الاستخدام**
4. **اختبر على Sepolia قبل Mainnet**

## استكشاف الأخطاء

- **"insufficient funds"**: تحتاج المزيد من Sepolia ETH
- **"nonce too high"**: أعد تشغيل MetaMask
- **"gas estimation failed"**: العقد غير موجود أو خطأ في الكود
- **"BAD_DATA"**: العقد غير منشور على العنوان المحدد