let capital = 1000000; // 기본 자본금 100만원
let selectedStockIndex = 0; // 선택된 주식의 인덱스
let ownedStocks = {}; // 보유 주식 정보 저장 { stockName: { price(가격), history(기록),category(기업상태) } }

// 주식 목록에 카테고리 추가
const stockData = [
  { name: '사성전자', price: 50000, history: [{ price: 50000 }], category: 'high' },
  { name: '계진소프트', price: 100000, history: [{ price: 10000 }], category: 'high' },
  { name: '민재상사', price: 15000, history: [{ price: 15000 }], category: 'medium' },
  { name: '남남수수학학원', price: 1000, history: [{ price: 100 }], category: 'low' },
  { name: '몽자동차', price: 15000, history: [{ price: 15000 }], category: 'medium' },
  { name: '초록박스어린이재단', price: 30000, history: [{ price: 4000 }], category: 'low' }
];

// 회사 이슈 데이터
const issueData = [
  { issueName: '신제품개발 성공', lossOfProfit: 2000 },
  { issueName: '정부 지원', lossOfProfit: 5000 },
  { issueName: '해외 시장 진출 성공', lossOfProfit: 3000 },
  { issueName: '도적 집단 토벌', lossOfProfit: 1500 },
  { issueName: '인수합병 성공', lossOfProfit: 5000 },
  { issueName: '대규모 인수합병 예정', lossOfProfit: 5000 },
  { issueName: '회장구속', lossOfProfit: 10000 },
  { issueName: '노벨평화상수상', lossOfProfit: 10000 },
  { issueName: '닌자 습격', lossOfProfit: -1000 },
  { issueName: '세금 체납', lossOfProfit: -800 },
  { issueName: '정부 규제 예정', lossOfProfit: -5800 },
  { issueName: '신재품 개발 취소', lossOfProfit: -2000 },
  { issueName: '부도 위기 소문', lossOfProfit: -1800 },
  { issueName: '신규 사업 실패', lossOfProfit: -3000 },
  { issueName: '대규모 파업', lossOfProfit: -1500 },
  { issueName: '도적집단 습격', lossOfProfit: -1200 },
  { issueName: '고객 데이터 유출', lossOfProfit: -1700 }
];

const stockListElement = document.getElementById('stock-list'); //주식목록
const ownedStocksListElement = document.getElementById('owned-stocks-list'); //보유주식목록
const capitalElement = document.getElementById('capital');   //자본금

const quantityInput = document.getElementById('quantity-buy'); // 매수 인풋값
const quantityInput_sell = document.getElementById('quantity-sell'); // 매도 인풋값

const buyButton = document.getElementById('buy-button');  //매수버튼
const sellButton = document.getElementById('sell-button'); //매도버튼
const saveButton = document.getElementById('save-button'); //저장버튼
const buyMaxButton = document.getElementById('buy-max');  //매도 최대 버튼
const sellMaxButton = document.getElementById('buy-sell'); //매수 최대버튼
const ctx = document.getElementById('stock-chart').getContext('2d'); //차트 
const costInfoElement = document.getElementById('cost-info'); // 매수 비용 정보를 표시할 요소
const stockIssueElement = document.getElementById('stock-issue'); //이슈데이터


// 매수량 입력값이 변경될 때마다 비용 정보 업데이트
quantityInput.addEventListener('input', updateCostInfo);
// 매도량 입력값이 변경될 때마다 수익 정보 업데이트
quantityInput_sell.addEventListener('input', updateSellCostInfo);

// 예측 매도 수익 계산
function updateSellCostInfo() {
  const quantity = parseInt(quantityInput_sell.value); // 입력된 매도량
  const stock = stockData[selectedStockIndex]; // 선택된 주식
  const sellProfit = stock.price * quantity; // 매도 수익 계산
  const costInfoSellElement = document.getElementById('cost-info-sell'); // 매도 수익 정보를 표시할 요소
  costInfoSellElement.textContent = `수익: ${sellProfit} 원`; // 수익 표시 업데이트
}

// 매수 비용 계산 및 업데이트
function updateCostInfo() {
  const quantity = parseInt(quantityInput.value); // 입력된 매수량
  const stock = stockData[selectedStockIndex]; // 선택된 주식
  const cost = stock.price * quantity; // 매수 비용 계산
  costInfoElement.textContent = `비용: ${cost} 원`; // 비용 표시 업데이트
}

// 차트 초기 설정
let stockChart = new Chart(ctx, {
  type: 'line', // 라인 차트 사용
  data: {
    labels: stockData[selectedStockIndex].history.map((_, i) => `시작가`), // 초기값 설정
    datasets: [{
      label: stockData[selectedStockIndex].name, // 선택된 주식 이름
      data: stockData[selectedStockIndex].history.map(entry => entry.price),
      borderColor: 'rgb(75, 192, 192)',
      fill: false,
      tension: 0.1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true // Y축이 0부터 시작하도록 설정
      }
    }
  }
});

// 페이지가 로드될 때 선택된 주식의 초기 차트 렌더링
function initializeChart() {
  const stock = stockData[selectedStockIndex];
  
  // 초기 레이블과 데이터셋 설정
  stockChart.data.datasets[0].label = stock.name;
  stockChart.data.datasets[0].data = stock.history.map(entry => entry.price);
  stockChart.update();
}
// 주식 목록에서 선택시 차트 업데이트 함수
function updateChart() {
  const stock = stockData[selectedStockIndex];
  
  // 차트 라벨과 데이터셋 업데이트
  stockChart.data.datasets[0].label = stock.name;
  stockChart.data.datasets[0].data = stock.history.map(entry => entry.price);
  
  //  라벨 업데이트 (현재 가격으로 변경)
  const newLabel = stock.price + "원";
  if (stockChart.data.labels.length >= 6) {
    stockChart.data.labels.shift(); // 오래된 요소제거
  }
  stockChart.data.labels.push(newLabel); // 새로운 라벨 추가

  stockChart.update(); // 차트 업데이트
}

// 랜덤 이슈 선택 함수
function getRandomIssue() {
  return issueData[Math.floor(Math.random() * issueData.length)];
}
// 주식 카테고리에 따른 이슈 영향 배수 정의
const issueImpactMultiplier = {
  high: 0.5,   // 우량주: 영향이 적음 (50% 적용)
  medium: 1,   // 보통주: 일반적인 영향 (100% 적용)
  low: 1.5     // 개잡주: 영향이 큼 (150% 적용)
};


// 주식 가격과 이슈 목록을 업데이트하는 함수
function updatePrices() {
  stockIssueElement.innerHTML = ''; // 기존 이슈 목록 초기화

  stockData.forEach(stock => {
    // 1. 기존 대기 중인 이슈를 확인하여 적용
    let issueImpact = 0;
    if (stock.pendingIssue) {
      // Adjust issue impact based on the stock's category
      issueImpact = Math.floor(stock.pendingIssue.lossOfProfit * issueImpactMultiplier[stock.category]);
    }

    // 2. 주식마다 새로운 랜덤 이슈 가져오기 (다음 회차 적용을 위해 대기)
    stock.pendingIssue = getRandomIssue();

    // 3. 카테고리에 따른 변동 제한 설정
    let maxChange;
    if (stock.category === 'high') {
      maxChange = Math.floor(stock.price * 0.1); // 우량주: 최대 ±10% 변동
    } else if (stock.category === 'medium') {
      maxChange = Math.floor(stock.price * 0.2); // 보통: 최대 ±20% 변동
    } else {
      maxChange = Math.floor(stock.price * 0.5); // 개잡주: 최대 ±50% 변동
    }

    // 4. 기본 변동값 계산
    const randomChange = Math.floor(Math.random() * (2 * maxChange)) - maxChange;

    // 5. 이슈 영향 적용 (이번 업데이트에 반영되는 이슈는 이전 대기 중이었던 이슈)
    const totalChange = randomChange + issueImpact;

    // 6. 주식 가격 업데이트 (3 미만 방지 로직 추가)
    const newPrice = stock.price + totalChange;
    stock.price = Math.max(3, newPrice > 0 ? newPrice : Math.floor(Math.random() * maxChange));

    // 7. 히스토리 기록 업데이트
    stock.history.push({ price: stock.price });
    if (stock.history.length > 10) {
      stock.history.shift();
    }

    // 8. 적용된 이슈를 이슈 목록에 추가 
    const issueItem = document.createElement('li');
    issueItem.innerHTML = `<span><strong>${stock.name}</strong>: ${stock.pendingIssue.issueName}</span>`;
    stockIssueElement.appendChild(issueItem); // 이슈 목록에 항목 추가
  });

  updateStockList();
  updateOwnedStocks();
  updateChart();
  updateCostInfo();
  updateSellCostInfo();
}



// 주식 목록 업데이트 함수
function updateStockList() {
  stockListElement.innerHTML = ''; // 기존 주식 목록 초기화
  stockData.forEach((stock, index) => {
    let oldPrice = 0;
    if (stock.history.length > 1) {
      oldPrice = stock.history[stock.history.length - 2].price; // 이전 가격
    }
    const profitOrLoss = stock.price - oldPrice; // 이익/손실 계산
    const profitOrLossClass = profitOrLoss >= 0 ? 'profit' : 'loss'; // 이익이면 파란색, 손실이면 빨간색

    // 새로운 목록 아이템 생성
    const li = document.createElement('li');
    li.innerHTML = `<strong>${stock.name}</strong>: <span class="${profitOrLossClass}"> ${stock.price} 원 </span> [ ${profitOrLoss}원 ${profitOrLoss >= 0 ? '증가' : '감소'} ]`;
    
    // 클릭 시 해당 주식의 차트를 업데이트하도록 설정
    li.addEventListener('click', () => {
      selectedStockIndex = index;
      updateChart(); // 선택된 주식의 차트 업데이트
    });
    
    stockListElement.appendChild(li); // 주식 목록에 추가
  });
}

/// 보유 주식 목록 업데이트 함수
function updateOwnedStocks() {
  ownedStocksListElement.innerHTML = ''; // 기존 보유 주식 목록 초기화

  Object.keys(ownedStocks).forEach(stockName => {
    const stock = stockData.find(s => s.name === stockName); // 주식 데이터에서 해당 주식 찾기
    if (stock) {
      const owned = ownedStocks[stockName]; // 보유한 주식 데이터
      const currentPrice = stock.price; // 현재가
      const totalCost = owned.quantity * owned.buyPrice; // 총 매입 비용
      const currentValue = owned.quantity * currentPrice; // 현재 가치
      const profitOrLoss = currentValue - totalCost; // 이익/손실 계산
      const profitOrLossClass = profitOrLoss >= 0 ? 'profit' : 'loss'; // 이익이면 파란색, 손실이면 빨간색

      // 보유 주식 목록에 표시할 내용 생성
      const li = document.createElement('li');
      li.innerHTML = `${stockName}: ${owned.quantity}주, 현재가: ${currentPrice} 원 
                      <span class="${profitOrLossClass}">
                        (${profitOrLoss >= 0 ? '+' : ''}${profitOrLoss} 원)
                      </span>`;

      // 클릭 시 해당 보유 주식의 차트를 업데이트하도록 설정
      li.addEventListener('click', () => {
        selectedStockIndex = stockData.findIndex(s => s.name === stockName); // 선택된 주식 인덱스 변경
        updateChart(); // 선택된 주식의 차트 업데이트
      });

      ownedStocksListElement.appendChild(li); // 보유 주식 목록에 추가
    }
  });
}


// URL에서 자본금, 보유 주식 상태, 주식 가격 히스토리 불러오기
function loadStateFromURL() {
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has('capital')) {
    capital = parseFloat(urlParams.get('capital'));
    capitalElement.textContent = capital;
  }

  if (urlParams.has('stocks')) {
    try {
      const stocksArray = JSON.parse(urlParams.get('stocks'));
      ownedStocks = {};
      stocksArray.forEach(stock => {
        ownedStocks[stock.name] = {
          quantity: stock.quantity,
          buyPrice: stock.buyPrice
        };
      });
      updateOwnedStocks();
    } catch (error) {
      console.error('Error parsing stocks from URL:', error);
    }
  }

  // 주식 히스토리 불러오기
  if (urlParams.has('stockHistory')) {
    try {
      const stockHistoryArray = JSON.parse(urlParams.get('stockHistory'));
      stockData.forEach(stock => {
        const savedStock = stockHistoryArray.find(s => s.name === stock.name);
        if (savedStock) {
          stock.price = savedStock.price;
          stock.history = savedStock.history;
        }
      });
      updateStockList();
      updateChart();
    } catch (error) {
      console.error('Error parsing stock history from URL:', error);
    }
  }
}

// 매수 함수
function buyStock() {
  const quantity = parseInt(quantityInput.value);
  const stock = stockData[selectedStockIndex];
  const cost = stock.price * quantity;
  if (capital >= cost) {
    capital -= cost;
    capitalElement.textContent = capital;
    if (ownedStocks[stock.name] && ownedStocks[stock.name].quantity >= quantity) {
      const totalQuantity = ownedStocks[stock.name].quantity + quantity;
      ownedStocks[stock.name].buyPrice =
        ((ownedStocks[stock.name].buyPrice * ownedStocks[stock.name].quantity) + cost) / totalQuantity;
      ownedStocks[stock.name].quantity = totalQuantity;
    } else {
      ownedStocks[stock.name] = { quantity, buyPrice: stock.price };
    }
    speakText('매수채결되었습니다');
    showTemporaryAlert(`${stock.name} 주식을 ${quantity}주 매수했습니다. 현재 가격: ${stock.price} 원`, 2000);
    updateOwnedStocks();
  } else {
    speakText('자본금이부족합니다');
    showTemporaryAlert('자본금이 부족합니다.', 2000);
  }
}

// 매도 함수
function sellStock() {
  const quantity = parseInt(quantityInput_sell.value);
  const stock = stockData[selectedStockIndex];
  if (ownedStocks[stock.name] && ownedStocks[stock.name].quantity >= quantity) {
    const profit = stock.price * quantity;
    capital += profit;
    ownedStocks[stock.name].quantity -= quantity;
    if (ownedStocks[stock.name].quantity === 0) {
      delete ownedStocks[stock.name];
    }
    capitalElement.textContent = capital;
    speakText('매도채결되었습니다');
    showTemporaryAlert(`${stock.name} 주식을 ${quantity}주 매도했습니다. 현재 가격: ${stock.price} 원`, 2000);
    updateOwnedStocks();
  } else {
    speakText('자본금이부족합니다');
    showTemporaryAlert('보유한 주식이 부족합니다.', 2000);
  }
}
// 최대 매도
function sellMax() {
  const stock = stockData[selectedStockIndex]; // 현재 선택된 주식
  if (ownedStocks[stock.name]) {
    const sellValue = ownedStocks[stock.name].quantity; // 보유한 주식 수량
    quantityInput_sell.value = sellValue; // 매도 인풋에 최대 수량 설정
  } else {
    quantityInput_sell.value = 1; // 주식이 없는 경우 1으로 설정
  }
}

//최대 매수
function buyMax(){
  
  const stock = stockData[selectedStockIndex]; //현재 선택 주식
  capitalElement.textContent = capital;
  const buyValue = parseInt(capital/stock.price);
  if(buyValue < 1){
    quantityInput.value = 1;
  }else{
    quantityInput.value =  buyValue;
  }
 
}
// 저장버튼 기능 구현
function saveState() {
  // 데이터 확인
  const stocksOwned = Object.keys(ownedStocks).map(stockName => {
    const stock = ownedStocks[stockName];
    return {
      name: stockName,
      quantity: stock.quantity,
      buyPrice: stock.buyPrice
    };
  });
  //url에 정보 저장
  const queryParams = new URLSearchParams({
    capital: capital,
    stocks: JSON.stringify(stocksOwned),
    stockHistory: JSON.stringify(stockData.map(stock => ({
      name: stock.name,
      price: stock.price,
      history: stock.history
    })))
  });

  //url에 값부여
  const url = '?' + queryParams.toString();
  //새로고침방지
  history.replaceState(null, '', url);
  //클립보드에 url 복사
  copyToClipboard(url);
  showTemporaryAlert('상태가 저장되었습니다!', 2000);
}


// 클립보드에 URL 복사 함수
function copyToClipboard(text) {
  navigator.clipboard.writeText(window.location.href)
    .then(() => console.log('URL copied to clipboard'))
    .catch(err => console.error('URL 복사가 실패:', err));
}

// 임시 알림 메시지 표시 함수
function showTemporaryAlert(message, duration) {
  const alertBox = document.createElement('div');
  alertBox.textContent = message;
  alertBox.className = 'alert';
  document.body.appendChild(alertBox);

  setTimeout(() => {
    alertBox.remove();
  }, duration);
}

//tts 설정
function speakText(text) {
    if ('speechSynthesis' in window) {
      console.log("이 브라우저는 TTS를 지원합니다.");
  } else {
      console.log("이 브라우저는 TTS를 지원하지 않습니다.");
  }
  // 음성합성 객체 생성
  const synth = window.speechSynthesis;
  const utterThis = new SpeechSynthesisUtterance(text);

  // 음성 설정 (선택 사항)
  utterThis.lang = 'ko-KR'; // 한국어로 설정
  utterThis.pitch = 1;      // 음높이 조절 (0 ~ 2)
  utterThis.rate = 1;       // 속도 조절 (0.1 ~ 10)

  // 음성합성 실행
  synth.speak(utterThis);
}
// 알림 상자 설정
const style = document.createElement('style');
style.innerHTML = `
  .alert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 15px;
    background-color: #c0c0c0;
    color: black;
    border: 2px solid #000;
    font-family: 'MS Sans Serif', Arial, sans-serif;
    font-size: 14px;
    box-shadow: 3px 3px #404040, -1px -1px #ffffff;
    z-index: 1000;
    width: 300px;
    text-align: center;
  }
`;
document.head.appendChild(style);

// 버튼 클릭 이벤트 설정
buyButton.addEventListener('click', buyStock);
sellButton.addEventListener('click', sellStock);
saveButton.addEventListener('click', saveState);

buyMaxButton.addEventListener('click', buyMax);
sellMaxButton.addEventListener('click', sellMax);
// 초기 로딩 및 이벤트 설정
function main() {
  loadStateFromURL();
  updateStockList();
  updateOwnedStocks();
  updateCostInfo(); //매수정보 바로업데이트
  updateSellCostInfo(); //매도정보
  setInterval(updatePrices, 6000); // 6초마다 주식 가격과 이슈 업데이트
}

// 초기 차트 및 메인 함수 실행
window.onload = function() {
  initializeChart();
  main();
};