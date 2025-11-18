FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
```

✅ **Saved as:** `Dockerfile`

---

## 📄 FILE 3: .gitignore

**Create file:** `.gitignore`

**Copy this code:**
```
node_modules/
package-lock.json
.env
.env.local
.env.*.local
logs/
*.log
npm-debug.log*
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.swo
test/
*.test.js
.railway/
