// api/proxy.js

// Neople API 키를 노출하지 않기 위해 환경 변수에서 불러옵니다.
// Vercel 프로젝트 설정에서 "Environment Variables"에 API_KEY를 등록해야 합니다.
const API_KEY = process.env.NEOPLE_API_KEY; 

// Vercel 서버리스 함수 핸들러
export default async function handler(request, response) {
    
    // 1. CORS Preflight 요청 처리 (OPTIONS 메서드)
    // 브라우저가 실제 요청 전에 이 요청을 먼저 보냅니다.
    if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Origin', '*'); // 모든 출처 허용
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.status(200).end();
        return;
    }

    // GET 요청만 처리
    if (request.method !== 'GET') {
        return response.status(405).send('Method Not Allowed');
    }

    // 2. 요청 URL에서 필요한 파라미터를 추출합니다.
    const { pathname, searchParams } = new URL(request.url, `http://${request.headers.host}`);
    
    // 요청 경로를 기반으로 API 엔드포인트와 필요한 파라미터를 재구성합니다.
    // pathname은 /api/proxy/servers/cain/characters 등처럼 올 것입니다.
    
    // Vercel URL 구조: /api/proxy/<Neople API URL 경로>
    // 네오플 API URL 경로를 추출합니다.
    const pathSegments = pathname.split('/').slice(3); // /api/proxy/ 이후의 경로
    const neoplePath = pathSegments.join('/');

    // 3. Neople API의 기본 URL을 만듭니다.
    // 예: https://api.neople.co.kr/df/servers/cain/characters
    let neopleApiUrl = `https://api.neople.co.kr/df/${neoplePath}?apikey=${API_KEY}`;
    
    // 4. 원래 요청에 있던 다른 쿼리 파라미터를 추가합니다.
    for (const [key, value] of searchParams.entries()) {
        // apikey는 서버리스 함수가 직접 추가하므로 제외합니다.
        if (key !== 'apikey') {
            neopleApiUrl += `&${key}=${value}`;
        }
    }

    console.log("Proxying request to:", neopleApiUrl);

    try {
        // 5. Neople API 호출
        const apiResponse = await fetch(neopleApiUrl);

        // 6. 응답 헤더 설정 및 응답 전달
        response.setHeader('Access-Control-Allow-Origin', '*'); // CORS 허용
        response.setHeader('Content-Type', apiResponse.headers.get('content-type') || 'application/json');
        
        // 상태 코드와 JSON 데이터를 클라이언트에 그대로 전달
        const data = await apiResponse.json();
        response.status(apiResponse.status).json(data);

    } catch (error) {
        console.error('Neople API 호출 실패:', error);
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.status(500).json({ error: 'Failed to fetch data from Neople API' });
    }
}
