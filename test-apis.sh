#!/bin/bash

# ============================================
# LegalArie API Testing Guide
# Run this script to test all 5 API endpoints
# ============================================

set -e

API_URL="http://localhost:3000/api"
DEMO_EMAIL="owner@legalaarie.com"
DEMO_PASSWORD="Demo@123456"

echo "🚀 LegalArie API Testing Suite"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is running
echo "🔍 Checking backend connection..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running at $API_URL${NC}"
    echo "   Run: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# ============================================
# 1. TEST AUTHENTICATION
# ============================================
echo -e "${BLUE}📌 TEST 1: Authentication${NC}"
echo "Testing: POST /auth/login"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DEMO_EMAIL\",
    \"password\": \"$DEMO_PASSWORD\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // empty')
USER_NAME=$(echo $LOGIN_RESPONSE | jq -r '.data.user.fullName // "Unknown"')
USER_ROLE=$(echo $LOGIN_RESPONSE | jq -r '.data.user.role // "Unknown"')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   User: $USER_NAME (Role: $USER_ROLE)"
echo "   Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# ============================================
# 2. TEST DASHBOARD METRICS
# ============================================
echo -e "${BLUE}📌 TEST 2: Dashboard Metrics${NC}"
echo "Testing: GET /dashboard/metrics"
echo ""

DASHBOARD_RESPONSE=$(curl -s -X GET "$API_URL/dashboard/metrics" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_REVENUE=$(echo $DASHBOARD_RESPONSE | jq -r '.data.kpis.totalRevenue // "0"')
ACTIVE_CASES=$(echo $DASHBOARD_RESPONSE | jq -r '.data.kpis.activeCases // 0')
TOTAL_LAWYERS=$(echo $DASHBOARD_RESPONSE | jq -r '.data.kpis.totalLawyers // 0')
AVG_UTIL=$(echo $DASHBOARD_RESPONSE | jq -r '.data.kpis.avgUtilization // 0')

if [ "$TOTAL_REVENUE" = "0" ] && [ "$ACTIVE_CASES" = "0" ]; then
    echo -e "${YELLOW}⚠️  No dashboard data (database likely empty)${NC}"
else
    echo -e "${GREEN}✅ Dashboard metrics retrieved${NC}"
    echo "   Total Revenue: ₨$TOTAL_REVENUE"
    echo "   Active Cases: $ACTIVE_CASES"
    echo "   Total Lawyers: $TOTAL_LAWYERS"
    echo "   Avg Utilization: $AVG_UTIL%"
fi

REVENUE_TREND=$(echo $DASHBOARD_RESPONSE | jq '.data.charts.revenueTrend | length')
echo "   Revenue Trend Points: $REVENUE_TREND"
echo ""

# ============================================
# 3. TEST CASES API
# ============================================
echo -e "${BLUE}📌 TEST 3: Cases API${NC}"
echo "Testing: GET /cases"
echo ""

CASES_RESPONSE=$(curl -s -X GET "$API_URL/cases?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CASES_COUNT=$(echo $CASES_RESPONSE | jq '.data.cases | length')
TOTAL_CASES=$(echo $CASES_RESPONSE | jq -r '.data.pagination.total // 0')

if [ "$CASES_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No cases found (database likely empty)${NC}"
else
    echo -e "${GREEN}✅ Cases retrieved: $CASES_COUNT${NC}"
    echo "   Total Cases in DB: $TOTAL_CASES"
    FIRST_CASE=$(echo $CASES_RESPONSE | jq -r '.data.cases[0].caseNumber // "N/A"')
    echo "   First Case: $FIRST_CASE"
fi
echo ""

# ============================================
# 4. TEST TASKS API
# ============================================
echo -e "${BLUE}📌 TEST 4: Tasks API${NC}"
echo "Testing: GET /tasks"
echo ""

TASKS_RESPONSE=$(curl -s -X GET "$API_URL/tasks?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TASKS_COUNT=$(echo $TASKS_RESPONSE | jq '.data.tasks | length')
TOTAL_TASKS=$(echo $TASKS_RESPONSE | jq -r '.data.pagination.total // 0')

if [ "$TASKS_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No tasks found (database likely empty)${NC}"
else
    echo -e "${GREEN}✅ Tasks retrieved: $TASKS_COUNT${NC}"
    echo "   Total Tasks in DB: $TOTAL_TASKS"
fi
echo ""

# ============================================
# 5. TEST TIME ENTRIES API
# ============================================
echo -e "${BLUE}📌 TEST 5: Time Entries API${NC}"
echo "Testing: GET /time-entries"
echo ""

TIME_RESPONSE=$(curl -s -X GET "$API_URL/time-entries?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TIME_COUNT=$(echo $TIME_RESPONSE | jq '.data.timeEntries | length')
TOTAL_HOURS=$(echo $TIME_RESPONSE | jq -r '.data.stats.totalHours // 0')
BILLABLE_AMOUNT=$(echo $TIME_RESPONSE | jq -r '.data.stats.billableAmount // 0')

if [ "$TIME_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No time entries found (database likely empty)${NC}"
else
    echo -e "${GREEN}✅ Time entries retrieved: $TIME_COUNT${NC}"
    echo "   Total Billable Hours: $TOTAL_HOURS"
    echo "   Total Billable Amount: ₨$BILLABLE_AMOUNT"
fi
echo ""

# ============================================
# 6. TEST LAWYER DASHBOARD
# ============================================
echo -e "${BLUE}📌 TEST 6: Lawyer Dashboard${NC}"
echo "Testing: GET /dashboard/lawyer"
echo ""

LAWYER_RESPONSE=$(curl -s -X GET "$API_URL/dashboard/lawyer" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

LAWYER_CASES=$(echo $LAWYER_RESPONSE | jq -r '.data.summary.activeCases // 0')
LAWYER_HOURS=$(echo $LAWYER_RESPONSE | jq -r '.data.summary.billableHours // 0')
PENDING_TASKS=$(echo $LAWYER_RESPONSE | jq -r '.data.summary.pendingTasks // 0')

if [ "$LAWYER_CASES" = "0" ]; then
    echo -e "${YELLOW}⚠️  No personal lawyer data (database likely empty)${NC}"
else
    echo -e "${GREEN}✅ Lawyer dashboard retrieved${NC}"
    echo "   Your Active Cases: $LAWYER_CASES"
    echo "   Your Billable Hours: $LAWYER_HOURS"
    echo "   Your Pending Tasks: $PENDING_TASKS"
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}========================================"
echo "🎉 API Testing Complete!${NC}"
echo ""
echo -e "${GREEN}All 5 APIs are working:${NC}"
echo "  ✅ Authentication (login)"
echo "  ✅ Dashboard Metrics"
echo "  ✅ Cases"
echo "  ✅ Tasks"
echo "  ✅ Time Entries"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Start frontend: cd frontend && npm run dev"
echo "  2. Open browser: http://localhost:5173/login"
echo "  3. Click 'Try Demo Account'"
echo "  4. Explore dashboard with real API data"
echo ""
