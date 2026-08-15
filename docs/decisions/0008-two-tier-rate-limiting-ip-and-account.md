# ADR 0008: Rate Limiting em Duas Camadas (IP + Conta)

**Status:** ACEITO  
**Data:** 2026-08-15  
**Decisores:** Danilo Mendes / Equipe de Engenharia  

---

## 1. Contexto
A Fase 10 identificou que o rate limiting baseado apenas em IP permitia que ataques distribuídos (usando múltiplos IPs) tentassem senhas contra um mesmo e-mail sem disparar o limite de 10 tentativas por IP.

## 2. Decisao
Implementar rate limiting de camada dupla no Redis:
1. **Camada IP:** Máximo de 10 tentativas por 15 minutos (`ratelimit_auth_ip_${clientIp}_${action}`).
2. **Camada Conta/Email:** Máximo de 5 tentativas por 15 minutos (`ratelimit_auth_acc_${hash}_${action}`).
   - O e-mail é normalizado e transformado em hash SHA-256 para preservar a privacidade e não armazenar PII nas chaves do Redis.
3. **Fail-Open:** Mantém a política Fail-Open (ADR 0005) em caso de falha do Redis para garantir a disponibilidade do sistema durante torneios presenciais.

## 3. Consequencias
- **Positivas:** Bloqueia ataques de força bruta direcionados a uma conta mesmo através de botnets/proxies distribuídos.
- **Trade-offs:** Um usuário que errar a senha 5 vezes consecutivas precisará aguardar 15 minutos ou usar outra conexão.
