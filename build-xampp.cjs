const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const sourceFile = path.join(__dirname, 'index.html');
const destFile = path.join(__dirname, 'xampp_grapas', 'index.php');

console.log('Iniciando compilação do arquivo index.php para o XAMPP...');

try {
    if (!fs.existsSync(sourceFile)) {
        console.error('Arquivo index.html de origem não encontrado!');
        process.exit(1);
    }

    let html = fs.readFileSync(sourceFile, 'utf8');

    // Substitui o bloco do Firebase SDK e banco local pelo conector XAMPP/MySQL de alta performance
    const targetStartMark = 'import { initializeApp } from "firebase/app";';
    const targetEndMark = '// Global DB state (Reactive update from Firestore)';

    const startIndex = html.indexOf(targetStartMark);
    const endIndex = html.indexOf(targetEndMark);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Marcas de substituição do Firebase não encontradas no index.html!');
        process.exit(1);
    }

    // Código do conector MySQL REST para substituir o Firebase
    const xamppConnectorCode = `// ==============================================================================
        // CLIENTE DE CONEXÃO REST DE ALTA PERFORMANCE (MYSQL / XAMPP)
        // ==============================================================================
        
        // Use standard global references for jsPDF
        const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;

        const activeCollectionCallbacks = {};
        const activeDocCallbacks = {};

        window.useLocalDatabase = false; // Desativado no XAMPP pois usamos o MySQL/PHP!

        const collection = (db, name) => ({ path: name, id: name });
        
        const doc = (db, pathOrColl, ...more) => {
            let path = "";
            if (typeof pathOrColl === 'string') {
                path = [pathOrColl, ...more].join('/');
            } else {
                path = [pathOrColl.path, ...more].join('/');
            }
            return { path, id: path.split('/').pop() };
        };

        const setDoc = async (ref, data, options) => {
            const parts = ref.path.split('/');
            const table = parts[0];
            const id = parts[1];
            try {
                const res = await fetch(\`api.php?action=set&table=\${table}&id=\${id}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                await pollData(); // Atualização imediata após escrita
                return result;
            } catch (e) {
                console.error("XAMPP write error:", e);
            }
        };

        const addDoc = async (collRef, data) => {
            const table = collRef.path;
            try {
                const res = await fetch(\`api.php?action=add&table=\${table}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                await pollData(); // Atualização imediata após escrita
                return result;
            } catch (e) {
                console.error("XAMPP write error:", e);
            }
        };

        const updateDoc = async (ref, data) => {
            const parts = ref.path.split('/');
            const table = parts[0];
            const id = parts[1];
            try {
                const res = await fetch(\`api.php?action=update&table=\${table}&id=\${id}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                await pollData(); // Atualização imediata após escrita
                return result;
            } catch (e) {
                console.error("XAMPP write error:", e);
            }
        };

        const deleteDoc = async (ref) => {
            const parts = ref.path.split('/');
            const table = parts[0];
            const id = parts[1];
            try {
                const res = await fetch(\`api.php?action=delete&table=\${table}&id=\${id}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const result = await res.json();
                await pollData(); // Atualização imediata após exclusão
                return result;
            } catch (e) {
                console.error("XAMPP write error:", e);
            }
        };

        const serverTimestamp = () => new Date().toISOString();

        function onSnapshot(ref, onNext, onError) {
            const pathParts = ref.path.split('/');
            
            if (pathParts.length === 2) {
                const [collName, docId] = pathParts;
                const key = \`\${collName}_\${docId}\`;
                if (!activeDocCallbacks[key]) activeDocCallbacks[key] = [];
                activeDocCallbacks[key].push(onNext);
                
                // Se já temos dados no cache, envia imediatamente para garantir resposta instantânea
                if (window.db && window.db[collName]) {
                    const docItem = window.db[collName].find(item => item.id === docId);
                    if (docItem) {
                        setTimeout(() => {
                            try {
                                onNext({
                                    exists: () => true,
                                    data: () => docItem,
                                    id: docId
                                });
                            } catch (err) { console.error(err); }
                        }, 0);
                    }
                }
            } else {
                const collName = ref.path;
                if (!activeCollectionCallbacks[collName]) activeCollectionCallbacks[collName] = [];
                activeCollectionCallbacks[collName].push(onNext);
                
                // Se já temos dados no cache, envia imediatamente para garantir resposta instantânea
                if (window.db && window.db[collName]) {
                    const items = window.db[collName];
                    setTimeout(() => {
                        try {
                            onNext({
                                docs: items.map(item => ({
                                    id: item.id,
                                    data: () => item
                                }))
                            });
                        } catch (err) { console.error(err); }
                    }, 0);
                }
            }
            
            pollData();
            return () => {
                // Função para desinscrever (opcional)
            };
        }

        // Armazena cache do hash dos dados para evitar re-renderização desnecessária e gargalos de performance
        let lastDataHash = "";
        
        async function pollData() {
            try {
                const res = await fetch('api.php?action=get_all');
                if (!res.ok) return;
                const data = await res.json();
                
                // Verifica se os dados realmente mudaram antes de acionar gatilhos reativos
                const dataStr = JSON.stringify(data);
                if (dataStr === lastDataHash) return;
                lastDataHash = dataStr;
                
                if (!window.db) window.db = {};
                
                for (const colName in data) {
                    const items = data[colName];
                    
                    // Atualiza cache local global do sistema reativo
                    window.db[colName] = items;
                    
                    if (activeCollectionCallbacks[colName]) {
                        const snap = {
                            docs: items.map(item => ({
                                id: item.id,
                                data: () => item
                            }))
                        };
                        activeCollectionCallbacks[colName].forEach(cb => {
                            try { cb(snap); } catch(err) { console.error(err); }
                        });
                    }
                    
                    if (colName === 'config') {
                        items.forEach(docItem => {
                            const docId = docItem.id;
                            const key = \`config_\${docId}\`;
                            if (activeDocCallbacks[key]) {
                                const snap = {
                                    exists: () => true,
                                    data: () => docItem,
                                    id: docId
                                };
                                activeDocCallbacks[key].forEach(cb => {
                                    try { cb(snap); } catch(err) { console.error(err); }
                                });
                            }
                        });
                    }
                }
                
                // Re-renderiza painel ativo
                if (typeof renderAll === 'function') {
                    renderAll();
                }
            } catch (e) {
                console.error("Erro na sincronização de dados do MySQL local:", e);
            }
        }

        // Polling constante simulando conexões Real-time do Firebase
        setInterval(pollData, 4000);
        
        // Define variáveis globais e expõe para o console
        const db_fs = null;
        window.db_fs = db_fs;
        window.fs_ops = { setDoc, addDoc, doc, collection, deleteDoc, updateDoc, serverTimestamp };
        
        // Inicializa o primeiro carregamento imediatamente
        pollData();
        
        // Global DB state (Reactive update from Firestore)`;

    // Monta o novo conteúdo substituindo o bloco do Firebase pelo XAMPP
    const beforeBlock = html.substring(0, startIndex);
    const afterBlock = html.substring(endIndex + targetEndMark.length);

    const compiledPHP = beforeBlock + xamppConnectorCode + afterBlock;

    // Salva o arquivo final
    fs.writeFileSync(destFile, compiledPHP, 'utf8');
    console.log(`Arquivo index.php gerado com sucesso em ${destFile}!`);

} catch (e) {
    console.error('Erro ao compilar o arquivo do XAMPP:', e);
    process.exit(1);
}
