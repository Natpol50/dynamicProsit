import { Prosit } from "@/types/prosit";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import PizZip from "pizzip";


export type ExportFormat = "docx" | "pdf";


export const DEFAULT_EXPORT_FORMAT: ExportFormat = "docx";
export const EXPORT_FORMAT_STORAGE_KEY = "prosit-export-format";

// biome-ignore lint/suspicious/noExplicitAny: any is required for dynamic import

let PizZipUtils: any = null;
if (typeof window !== "undefined") {
	import("pizzip/utils/index.js").then((r) => {
		PizZipUtils = r;
	});
}

// biome-ignore lint/suspicious/noExplicitAny: the lib doesn't specify the type
function loadFile(url: string, callback: (error: any, content: any) => void) {
	PizZipUtils.getBinaryContent(url, callback);
}

const sanitizeFilename = (value: string) =>
	value
		.trim()
		.replaceAll("/", "-")
		.replaceAll("\\", "-")
		.replaceAll(" ", "_");

const buildExportValues = (prosit: Prosit) => ({
	titre: prosit.titre.trim(),
	contexte: prosit.contexte.trim(),
	generalisation: prosit.generalisation.trim(),
	lien: prosit.lien.trim(),
	animateur: prosit.animateur.trim(),
	secretaire: prosit.secretaire.trim(),
	gestionnaire: prosit.gestionnaire.trim(),
	scribe: prosit.scribe.trim(),
	motsCles: prosit.motsCles.map((motCle) => motCle.content.trim()),
	contraintes: prosit.contraintes.map((contrainte) => contrainte.content.trim()),
	problematiques: prosit.problematiques.map((problematique) =>
		problematique.content.trim(),
	),
	livrables: prosit.livrables.map((livrable) => livrable.content.trim()),
	pistesDeSolutions: prosit.pistesDeSolutions.map((pisteDeSolution) =>
		pisteDeSolution.content.trim(),
	),
	planDAction: prosit.planDAction.map((etape) => etape.content.trim()),
});


const escapeHtml = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");


const formatDateTime = (date: Date) =>
	new Intl.DateTimeFormat("fr-FR", {
		dateStyle: "long",
		timeStyle: "short",
	}).format(date);

const renderListSection = (title: string, items: string[]) => {
	const content =
		items.length === 0
			? "<li class='empty'>Aucun élément renseigné.</li>"
			: items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

	return `
		<section class="section">
			<h2>${escapeHtml(title)}</h2>
			<ul>${content}</ul>
		</section>
	`;
};

const loadTextFile = async (url: string) => {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`Unable to load template: ${url}`);
	}

	return response.text();
};

const fillTemplate = (template: string, values: Record<string, string>) =>
	Object.entries(values).reduce(
		(currentTemplate, [key, value]) =>
			currentTemplate.replaceAll(`{{${key}}}`, value),
		template,
	);

const exportDocx = (prosit: Prosit) => {
	loadFile("/template.docx", (error, content) => {
		if (error) {
			throw error;
		}
		const zip = new PizZip(content);
		const doc = new Docxtemplater()
			.loadZip(zip)
			.setOptions({ paragraphLoop: true, linebreaks: true });

		doc.render(buildExportValues(prosit));
		const blob = doc.getZip().generate({
			type: "blob",
			mimeType:
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		});
		saveAs(blob, `PA-${sanitizeFilename(prosit.titre)}.docx`);
	});
};

const exportPdf = async (prosit: Prosit) => {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	const values = buildExportValues(prosit);
	const instanceUrl = window.location.href;
	const instanceOrigin = window.location.origin;
	const generatedAt = formatDateTime(new Date());
	const template = await loadTextFile("/template-pdf.html");
	const sections = [
		renderListSection("Généralisation", values.generalisation ? [values.generalisation] : []),
		renderListSection("Mots clefs", values.motsCles),
		renderListSection("Contraintes", values.contraintes),
		renderListSection("Problématiques", values.problematiques),
		renderListSection("Pistes de solution", values.pistesDeSolutions),
		renderListSection("Livrables", values.livrables),
		renderListSection("Plan d'action", values.planDAction),
	].join("");
	const html = fillTemplate(template, {
		title: `PA-${sanitizeFilename(values.titre)} - ${instanceOrigin}`,
		titleText: values.titre,
		instanceUrl: escapeHtml(instanceUrl),
		instanceOrigin: escapeHtml(instanceOrigin),
		generatedAt: escapeHtml(generatedAt),
		lien: escapeHtml(values.lien || "—"),
		contexte: escapeHtml(values.contexte || "—"),
		sections,
	});
	const iframe = document.createElement("iframe");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.border = "0";
	iframe.style.visibility = "hidden";
	iframe.setAttribute("aria-hidden", "true");
	iframe.srcdoc = html;
	iframe.onload = () => {
		const iframeWindow = iframe.contentWindow;
		if (!iframeWindow) {
			iframe.remove();
			return;
		}

		const cleanup = () => {
			window.removeEventListener("afterprint", cleanup);
			iframe.remove();
		};

		window.addEventListener("afterprint", cleanup);
		iframeWindow.focus();
		iframeWindow.print();
	};
	document.body.appendChild(iframe);
};

export const todocx = async (
	prosit: Prosit,
	format: ExportFormat = DEFAULT_EXPORT_FORMAT,
) => {
	if (format === "pdf") {
		await exportPdf(prosit);
		return;
	}

	exportDocx(prosit);
};
