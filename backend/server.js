// Optional backend server for future use
// Currently not part of the MVP

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' })
})

// Future endpoints:
// - GET /api/payments - Payment history
// - POST /api/webhooks - Blockchain event webhooks
// - GET /api/users/:address - User preferences

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`)
})