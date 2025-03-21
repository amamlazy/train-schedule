document.addEventListener('DOMContentLoaded', () => {
  // 要素の取得
  const stationSelect = document.getElementById('station-select');
  const directionSelect = document.getElementById('direction-select');
  const trainList = document.getElementById('train-list');
  const currentTimeElement = document.getElementById('current-time');
  const dayTypeElement = document.getElementById('day-type');
  const refreshBtn = document.getElementById('refresh-btn');
  const favoriteBtn = document.getElementById('favorite-btn');
  const favoritesList = document.getElementById('favorites-list');
  const nearestStationBtn = document.getElementById('nearest-station-btn');
  const loadingIndicator = document.getElementById('loading-indicator');
  const toast = document.getElementById('toast');
  
  // お気に入りデータを取得
  let favorites = JSON.parse(localStorage.getItem('trainFavorites')) || [];
  
  // 初期化関数
  function initialize() {
    // 駅リストを動的に生成
    for (const station in scheduleData) {
      const option = document.createElement('option');
      option.value = station;
      option.textContent = station;
      stationSelect.appendChild(option);
    }
    
    // イベントリスナーの設定
    stationSelect.addEventListener('change', onStationChange);
    directionSelect.addEventListener('change', onDirectionChange);
    refreshBtn.addEventListener('click', updateTrainList);
    favoriteBtn.addEventListener('click', addFavorite);
    nearestStationBtn.addEventListener('click', findNearestStation);
    
    // 現在時刻の初期表示
    updateCurrentTime();
    
    // お気に入りの表示
    renderFavorites();
    
    // 1秒ごとに時刻を更新
    setInterval(() => {
      updateCurrentTime();
    }, 1000);
    
    // 30秒ごとに電車リストを更新（選択されている場合）
    setInterval(() => {
      if (stationSelect.value && directionSelect.value) {
        updateTrainList();
      }
    }, 30000);
  }
  
  // 現在時刻を更新する関数
  function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    
    // 平日/休日の判定
    const dayType = [0, 6].includes(now.getDay()) ? '休日' : '平日';
    dayTypeElement.textContent = dayType;
    
    // 残り時間の表示を更新
    updateRemainingTimes();
    
    return now;
  }
  
  // 残り時間の表示を更新
  function updateRemainingTimes() {
    const trainItems = document.querySelectorAll('.train-item');
    if (trainItems.length === 0) return;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    trainItems.forEach(item => {
      const departureTimeEl = item.querySelector('.departure-time');
      const remainingTimeEl = item.querySelector('.remaining-time');
      
      if (departureTimeEl && remainingTimeEl) {
        const [hours, minutes] = departureTimeEl.textContent.split(':').map(Number);
        const departureMinutes = hours * 60 + minutes;
        const remainingMinutes = departureMinutes - currentMinutes;
        
        remainingTimeEl.textContent = `${remainingMinutes}分後`;
        
        // 5分以内は赤色表示
        if (remainingMinutes <= 5) {
          remainingTimeEl.style.color = '#ef4444';
        } else {
          remainingTimeEl.style.color = '';
        }
      }
    });
  }
  
  // 駅選択時の処理
  function onStationChange() {
    directionSelect.innerHTML = '<option value="">方面を選択</option>';
    trainList.innerHTML = '<p class="no-selection">方面を選択してください</p>';
    favoriteBtn.disabled = true;
    
    if (stationSelect.value) {
      directionSelect.disabled = false;
      
      // 選択された駅の方面リストを生成
      const directions = Object.keys(scheduleData[stationSelect.value]);
      directions.forEach(direction => {
        const option = document.createElement('option');
        option.value = direction;
        option.textContent = direction;
        directionSelect.appendChild(option);
      });
    } else {
      directionSelect.disabled = true;
    }
  }
  
  // 方面選択時の処理
  function onDirectionChange() {
    if (directionSelect.value) {
      updateTrainList();
      favoriteBtn.disabled = false;
    } else {
      trainList.innerHTML = '<p class="no-selection">方面を選択してください</p>';
      favoriteBtn.disabled = true;
    }
  }
  
  // 電車リストを更新する関数
  function updateTrainList() {
    showLoading(true);
    trainList.innerHTML = '';
    
    const station = stationSelect.value;
    const direction = directionSelect.value;
    
    if (!station || !direction) {
      trainList.innerHTML = '<p class="no-selection">駅と方面を選択してください</p>';
      showLoading(false);
      return;
    }
    
    const now = updateCurrentTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // 平日か休日かを判断
    const dayType = [0, 6].includes(now.getDay()) ? 'weekend' : 'weekday';
    
    // 該当する時刻表データを取得
    const scheduleForDirection = scheduleData[station][direction];
    const schedule = scheduleForDirection.find(s => s.type === dayType);
    
    if (!schedule) {
      trainList.innerHTML = '<p class="no-selection">この時間帯の運行データがありません</p>';
      showLoading(false);
      return;
    }
    
    const { times, types } = schedule;
    
    // 現在時刻以降の発車時刻を抽出（最大5件）
    const upcomingTrains = times
      .map((time, index) => ({ time, type: types[index], index }))
      .filter(item => item.time >= currentMinutes)
      .slice(0, 5);
    
    if (upcomingTrains.length === 0) {
      trainList.innerHTML = '<p class="no-selection">本日の運行は終了しました</p>';
      showLoading(false);
      return;
    }
    
    // 電車リストを生成
    upcomingTrains.forEach((train, index) => {
      const hours = Math.floor(train.time / 60).toString().padStart(2, '0');
      const minutes = (train.time % 60).toString().padStart(2, '0');
      const remainingMinutes = train.time - currentMinutes;
      
      const trainItem = document.createElement('div');
      trainItem.className = 'train-item';
      
      // 最初の要素（次の電車）は強調表示
      if (index === 0) {
        trainItem.classList.add('next');
      }
      
      trainItem.innerHTML = `
        <div>
          <div class="departure-time">${hours}:${minutes}</div>
          <div class="train-type">${train.type || '各停'}</div>
        </div>
        <div class="remaining-time">${remainingMinutes}分後</div>
      `;
      
      trainList.appendChild(trainItem);
    });
    
    setTimeout(() => {
      showLoading(false);
    }, 500); // 少し遅延させて読み込み感を出す
  }
  
  // お気に入りを追加する関数
  function addFavorite() {
    const station = stationSelect.value;
    const direction = directionSelect.value;
    
    if (!station || !direction) return;
    
    // 重複チェック
    const isDuplicate = favorites.some(
      fav => fav.station === station && fav.direction === direction
    );
    
    if (isDuplicate) {
      showToast('すでにお気に入りに登録されています', 'error');
      return;
    }
    
    // お気に入りに追加
    favorites.push({ station, direction });
    
    // ローカルストレージに保存
    localStorage.setItem('trainFavorites', JSON.stringify(favorites));
    
    // お気に入りリストを更新
    renderFavorites();
    
    // 成功メッセージ
    showToast('お気に入りに追加しました', 'success');
  }
  
  // お気に入りリストを表示する関数
  function renderFavorites() {
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<p class="no-selection">登録されたお気に入りはありません</p>';
      return;
    }
    
    favorites.forEach((favorite, index) => {
      const favoriteItem = document.createElement('div');
      favoriteItem.className = 'favorite-item';
      favoriteItem.innerHTML = `
        <div class="favorite-info">
          <div class="favorite-station-direction">${favorite.station} - ${favorite.direction}</div>
        </div>
        <button class="remove-favorite" data-index="${index}">削除</button>
      `;
      
      // クリックイベント - この設定でお気に入りを選択
      favoriteItem.addEventListener('click', (e) => {
        // 削除ボタンのクリックなら伝播を止める
        if (e.target.className === 'remove-favorite') return;
        
        selectFavorite(favorite);
      });
      
      favoritesList.appendChild(favoriteItem);
    });
    
    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.remove-favorite').forEach(button => {
      button.addEventListener('click', removeFavorite);
    });
  }
  
  // お気に入りを選択する関数
  function selectFavorite(favorite) {
    // 駅を選択
    stationSelect.value = favorite.station;
    onStationChange();
    
    // 方面を選択 (駅選択のonChangeが終わるのを待つ)
    setTimeout(() => {
      directionSelect.value = favorite.direction;
      onDirectionChange();
    }, 10);
  }
  
  // お気に入りを削除する関数
  function removeFavorite(e) {
    const index = parseInt(e.target.getAttribute('data-index'));
    
    // お気に入りから削除
    favorites.splice(index, 1);
    
    // ローカルストレージに保存
    localStorage.setItem('trainFavorites', JSON.stringify(favorites));
    
    // お気に入りリストを更新
    renderFavorites();
    
    // 成功メッセージ
    showToast('お気に入りを削除しました', 'success');
  }
  
  // 位置情報から最寄り駅を検索する関数
  function findNearestStation() {
    // 駅の位置情報データがあるか確認
    if (!stationGeoData) {
      showToast('駅の位置情報データが読み込まれていません', 'error');
      return;
    }
    
    showLoading(true);
    
    // 位置情報の取得を許可するかプロンプト
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 現在位置の取得に成功
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          // 各駅との距離を計算
          let nearestStation = null;
          let shortestDistance = Infinity;
          
          for (const [stationName, coords] of Object.entries(stationGeoData)) {
            const distance = calculateDistance(
              userLat, userLng, 
              coords.lat, coords.lng
            );
            
            if (distance < shortestDistance) {
              shortestDistance = distance;
              nearestStation = stationName;
            }
          }
          
          // 最寄り駅を選択
          if (nearestStation) {
            stationSelect.value = nearestStation;
            // 選択した駅に対応する方面リストを生成する関数を呼び出し
            onStationChange();
            
            // 成功メッセージを表示
            showToast(`最寄り駅「${nearestStation}」を設定しました`, 'success');
          } else {
            showToast('最寄りの駅が見つかりませんでした', 'error');
          }
          
          // ローディング非表示
          showLoading(false);
        },
        (error) => {
          // エラー処理
          console.error('位置情報の取得に失敗しました:', error);
          showToast('位置情報の取得に失敗しました', 'error');
          showLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      // Geolocation APIに対応していない場合
      showToast('お使いのブラウザは位置情報に対応していません', 'error');
      showLoading(false);
    }
  }
  
  // 2点間の距離を計算する関数（ヴィンセンティの公式）
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径（km）
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // 距離（km）
    return distance;
  }
  
  // 度からラジアンに変換する関数
  function deg2rad(deg) {
    return deg * (Math.PI/180);
  }
  
  // ローディング表示の切り替え
  function showLoading(isLoading) {
    if (isLoading) {
      loadingIndicator.classList.add('show');
    } else {
      loadingIndicator.classList.remove('show');
    }
  }
  
  // トースト通知を表示する関数
  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    // 3秒後に非表示
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // アプリケーションの初期化
  initialize();
});