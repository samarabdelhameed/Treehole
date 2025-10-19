# TreeHole - دليل حل المشاكل

## المشاكل الشائعة وحلولها

### 1. مشكلة "Transfer request" في MetaMask

**الأعراض:**
- ظهور نافذة MetaMask مع معاملة "Transfer request"
- رسوم غاز عالية (0.13 ETH أو أكثر)
- تحذيرات في العنوان المستهدف

**الأسباب المحتملة:**
- الاتصال بشبكة Ethereum الرئيسية بدلاً من شبكة الاختبار
- عناوين العقود غير صحيحة
- مشكلة في إعدادات الشبكة

**الحلول:**

#### أ) التأكد من الشبكة الصحيحة
1. افتح MetaMask
2. تأكد من أنك متصل بـ **Sepolia Test Network**
3. إذا لم تكن كذلك، اضغط على اسم الشبكة واختر Sepolia
4. إذا لم تجد Sepolia، أضفها يدوياً:
   - Network Name: `Sepolia Test Network`
   - RPC URL: `https://sepolia.infura.io/v3/`
   - Chain ID: `11155111`
   - Currency Symbol: `SEP`
   - Block Explorer: `https://sepolia.etherscan.io`

#### ب) استخدام زر التبديل في التطبيق
1. في TreeHole، اضغط على "Connect Wallet"
2. إذا ظهر تحذير الشبكة، اضغط على "Switch to Sepolia"
3. وافق على التبديل في MetaMask

#### ج) التحقق من العقود
1. في TreeHole، اذهب إلى Settings
2. اضغط على "Run System Diagnostics"
3. راجع التقرير للتأكد من صحة العقود

### 2. مشكلة "Insufficient funds for gas"

**الحل:**
1. احصل على Sepolia ETH مجاناً من:
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
2. تحتاج على الأقل 0.001 ETH للمعاملات

### 3. مشكلة "Already claimed" في Faucet

**الحل:**
- يمكن المطالبة بالرموز مرة واحدة كل 24 ساعة
- انتظر حتى انتهاء المدة أو استخدم محفظة أخرى للاختبار

### 4. مشكلة "Contract not found" أو "BAD_DATA"

**الأعراض:**
- خطأ `could not decode result data (value="0x")`
- رسالة "Contract not found"

**الحل:**
1. **تأكد من الشبكة:** يجب أن تكون على Sepolia testnet
2. **تحقق من العقود:** استخدم أداة التشخيص في Settings
3. **استخدم وضع التجريب:** التطبيق سيتحول تلقائياً لوضع المحاكاة إذا لم تكن العقود منشورة
4. **نشر العقود:** راجع ملف `DEPLOY_CONTRACTS.md` لنشر العقود الحقيقية

**وضع المحاكاة:**
- إذا لم تكن العقود منشورة، سيعمل التطبيق في وضع تجريبي
- ستظهر علامة "DEMO" بجانب الرصيد
- جميع المعاملات ستكون محاكاة فقط

### 5. معاملات بطيئة أو معلقة

**الحل:**
1. زيد رسوم الغاز في MetaMask
2. أو انتظر حتى تقل ازدحام الشبكة
3. يمكنك إلغاء المعاملة وإعادة المحاولة برسوم أعلى

## أدوات التشخيص

### استخدام أداة التشخيص المدمجة
1. افتح TreeHole
2. اضغط على أيقونة Settings (⚙️)
3. اضغط على "Run System Diagnostics"
4. راجع التقرير لتحديد المشاكل

### فحص يدوي
```javascript
// في console المتصفح
console.log('Network:', await ethereum.request({method: 'eth_chainId'}));
console.log('Accounts:', await ethereum.request({method: 'eth_accounts'}));
```

## معلومات الشبكة

### Sepolia Testnet
- **Chain ID:** 11155111 (0xaa36a7)
- **RPC URL:** https://sepolia.infura.io/v3/
- **Explorer:** https://sepolia.etherscan.io
- **Faucets:** 
  - https://sepoliafaucet.com/
  - https://faucet.sepolia.dev/

### عناوين العقود (Sepolia)
```
TestToken: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
PaymentSplitter: 0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6
```

## نصائح للاختبار

1. **استخدم دائماً شبكة اختبار** - لا تختبر على Mainnet أبداً
2. **احتفظ برصيد ETH للغاز** - على الأقل 0.01 ETH في محفظة الاختبار
3. **استخدم عناوين مختلفة** - للاختبار الشامل
4. **راقب console المتصفح** - للأخطاء التفصيلية
5. **استخدم أداة التشخيص** - قبل الإبلاغ عن مشاكل

## الحصول على المساعدة

إذا استمرت المشكلة:
1. شغل أداة التشخيص واحفظ التقرير
2. افحص console المتصفح للأخطاء
3. تأكد من اتباع جميع الخطوات أعلاه
4. قدم تفاصيل المشكلة مع لقطات الشاشة