import { render } from 'preact';
import { html } from 'htm/preact';

function Package({ pkg }) {
    const versions = Object.values(pkg.versions);
    if (versions.length === 0) {
        return null;
    }

    const latestPackage = versions[versions.length - 1];
    const recommendedPackage = versions.findLast(v => !v.version.includes('-')) || latestPackage;

    return html`
        <li>
            ${latestPackage.displayName ?? latestPackage.name} - ${latestPackage.description}
            <ul>
                <li>Latest Version: <a href=${latestPackage.url}>${latestPackage.version}</a></li>
                <li>Recommended Version: <a href=${recommendedPackage.url}>${recommendedPackage.version}</a></li>
            </ul>
            <details>
                <summary>All Versions for ${latestPackage.displayName ?? latestPackage.name}</summary>
                <ul>
                    ${versions.map(version => html`<li><a href=${version.url}>${version.version}</a></li>`)}
                </ul>
            </details>
        </li>
    `;
}

function App({ vpmListing }) {
    console.log(vpmListing);
    return html`
        <h1>${vpmListing.name}</h1>
        <p>We're currently hosting ${Object.keys(vpmListing.packages).length} packages.</p>
        <ul>
            ${Object.values(vpmListing.packages).map(pkg => html`<${Package} pkg=${pkg} />`)}
        </ul>
    `;
}

async function bootstrap() {
    try {
        const response = await fetch("vpm.json");

        if (!response.ok) {
            throw new Error(`Failed to fetch vpm.json: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        render(html`<${App} vpmListing=${json} />`, document.getElementById('app'));
    } catch (error) {
        console.error('Error during bootstrap:', error);
        document.getElementById("app").textContent = `画面の構築中にエラーが発生しました。リロードしてください。(${error})`;
    }
}

bootstrap();
