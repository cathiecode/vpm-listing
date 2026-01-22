import { render } from 'preact';
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';

function Package({ pkg, vpmListing }) {
    const versions = Object.values(pkg.versions);
    if (versions.length === 0) {
        return null;
    }

    const latestPackage = versions[versions.length - 1];
    const recommendedPackage = versions.findLast(v => !v.version.includes('-')) || latestPackage;

    return html`
        <section>
            <h2>${latestPackage.displayName ?? latestPackage.name}</h2>
            ${latestPackage.description ? html`<p>${latestPackage.description}</p>` : null}
            ${latestPackage.dependencies && Object.keys(latestPackage.dependencies).length > 0 ? html`
                <h3>Dependencies</h3>
                <ul>
                    ${Object.entries(latestPackage.dependencies).map(([depName, depVersion]) => 
                        html`<li>${depName}: ${depVersion}</li>`)}
                </ul>
            ` : null}
            ${latestPackage.vpmDependencies && Object.keys(latestPackage.vpmDependencies).length > 0 ? html`
                <h3>VPM Dependencies</h3>
                <ul>
                    ${Object.entries(latestPackage.vpmDependencies).map(([depName, depVersion]) => 
                        html`<li>${depName}: ${depVersion}</li>`)}
                </ul>
            ` : null}
            <h3>Downloads</h3>
            <p>
                ${latestPackage.displayName ?? latestPackage.name} can be installed via VCC or alternative clients: <a href="vcc://vpm/addRepo?url=${vpmListing.url}">Add this repository to VCC</a>
            </p>
            <h3>Versions</h3>
            <p>Latest Version: <a href=${latestPackage.url}>${latestPackage.version}</a></p>
            <p>Recommended Version: <a href=${recommendedPackage.url}>${recommendedPackage.version}</a></p>
            <details>
                <summary>All Versions for ${latestPackage.displayName ?? latestPackage.name}</summary>
                <ul>
                    ${versions.map(version => html`<li><a href=${version.url}>${version.version}</a></li>`)}
                </ul>
            </details>
        </section>
    `;
}

function App({ vpmListing }) {
    const [copied, setCopied] = useState(false);

    return html`
        <div style=${{textAlign: "center"}}>
            <img src="./icon.png" alt="" style=${{width: "3em", height: "3em"}} />
            <h1 style=${{marginTop: 0}}>${vpmListing.name}</h1>
            <a href="vcc://vpm/addRepo?url=${vpmListing.url}"><button style=${{backgroundColor: "#0076d1", color: "#ffffff"}}>Add to VCC</button></a>
            <button onClick=${() => {navigator.clipboard.writeText(vpmListing.url) && setCopied(true)}}>${copied ? html`Repository URL Copied!` : "Copy repository url"}</button>
        </div>
        <p>We're currently hosting ${Object.keys(vpmListing.packages).length} packages.</p>
        ${Object.values(vpmListing.packages).map(pkg => html`<${Package} pkg=${pkg} vpmListing=${vpmListing} />`)}
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
