"use client";

import classes from "@/app/Demo.module.css";
import { globalHotKeys } from "@/components/globalHotKeys";
import PrositContext from "@/components/prositContext";
import {
	DEFAULT_EXPORT_FORMAT,
	EXPORT_FORMAT_STORAGE_KEY,
	todocx,
	type ExportFormat,
} from "@/components/todocx";
import useNavigator from "@/hooks/useNavigator";
import { AnchorsKeys, AnchorsLabels } from "@/types/anchors";
import {
	AppShell,
	ActionIcon,
	Burger,
	Group,
	Button,
	Kbd,
	Modal,
	Menu,
	NavLink,
	Text,
	Title,
	Tooltip,
	useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import clsx from "clsx";
import {
	AlertCircle,
	AreaChart,
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	HelpCircle,
	Info,
	KeyRound,
	Lightbulb,
	MapPinned,
	MonitorPlay,
	MoonStar,
	Sun,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";

export default function FormLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [opened, { toggle }] = useDisclosure();
	const [openSec, { toggle: ToggleSec }] = useDisclosure();
	const [modalopened, { open, close }] = useDisclosure(false);
	const pathname = usePathname();
	const { prosit, setProsit, clearProsit } = useContext(PrositContext);
	const [exportFormat, setExportFormat] = useState<ExportFormat>(DEFAULT_EXPORT_FORMAT);
	const [isExportFormatReady, setIsExportFormatReady] = useState(false);
	const { navigate, setAnchor, next, previous, nextAnchor, previousAnchor } =
		useNavigator({
			prosit,
			setProsit,
		});

	// maybe find a better way to type this
	// biome-ignore lint/suspicious/noExplicitAny: the type of presentationWindow is too complex tobe typed
	const [presentationWindow, setPresentationWindow] = useState<any | null>();
	const { toggleColorScheme } = useMantineColorScheme();

	useHotkeys([
		["f1", () => toggle()],
		["ctrl+s", () => todocx(prosit, exportFormat)],
		["ctrl+alt+l", () => toggleColorScheme()],
		...globalHotKeys(navigate),
	]);

	useEffect(() => {
		const storedFormat = localStorage.getItem(EXPORT_FORMAT_STORAGE_KEY);
		if (storedFormat === "pdf" || storedFormat === "docx") {
			setExportFormat(storedFormat);
		}
		setIsExportFormatReady(true);
	}, []);

	useEffect(() => {
		if (!isExportFormatReady) return;
		localStorage.setItem(EXPORT_FORMAT_STORAGE_KEY, exportFormat);
	}, [exportFormat, isExportFormatReady]);

	return (
		<div>
			<Modal
				centered
				opened={modalopened}
				onClose={close}
				title="Etes vous sur de voir réinitialiser votre prosit ?"
			>
				<div className="flex justify-between items-end h-20">
					<Button
						onClick={() => {
							clearProsit();
							close();
						}}
						color="red"
						variant="transparent"
					>
						Réinitialiser
					</Button>
					<Button onClick={close}>Annuler</Button>
				</div>
			</Modal>

			<AppShell
				// header={{ height: 60 }}
				navbar={{
					width: 300,
					breakpoint: "md",
					collapsed: { mobile: !openSec, desktop: false },
				}}
				aside={{
					width: 300,
					breakpoint: "sm",
					collapsed: { mobile: !opened, desktop: !opened },
				}}
				padding="md"
			>
				<AppShell.Navbar p="md" className="flex flex-col gap-6 ">
					<div className="flex justify-between items-center">
						<Title order={1} lh={1}>
							Les prosits là,
							<div className="font-light"> super</div>
						</Title>
						<Burger
							opened={openSec}
							onClick={ToggleSec}
							hiddenFrom="md"
							size="md"
						/>
					</div>
					<div className="flex flex-col justify-center flex-1 gap-3">
						<NavLink
							active={pathname === "/"}
							label="Informations"
							leftSection={<Info size="1rem" />}
							onClick={() => {
								navigate(AnchorsKeys.INFORMATIONS);
							}}
						/>
						<NavLink
							label="Mots clefs"
							leftSection={<KeyRound size="1rem" />}
							active={pathname === "/mots-clefs"}
							onClick={() => {
								navigate(AnchorsKeys.MOTS_CLEFS);
							}}
						/>

						<NavLink
							label="Contraintes"
							leftSection={<AlertCircle size="1rem" />}
							active={pathname === "/contraintes"}
							onClick={() => {
								navigate(AnchorsKeys.CONTRAINTES);
							}}
						/>

						<NavLink
							label="Problématiques"
							leftSection={<HelpCircle size="1rem" />}
							active={pathname === "/problematiques"}
							onClick={() => {
								navigate(AnchorsKeys.PROBLEMATIQUES);
							}}
						/>
						<NavLink
							label="Pistes de solution"
							leftSection={<Lightbulb size="1rem" />}
							active={pathname === "/pistes-de-solution"}
							onClick={() => {
								navigate(AnchorsKeys.PISTES_DE_SOLUTION);
							}}
						/>
						<NavLink
							label="Livrables"
							leftSection={<AreaChart size="1rem" />}
							active={pathname === "/livrables"}
							onClick={() => {
								navigate(AnchorsKeys.LIVRABLES);
							}}
						/>
						<NavLink
							label="Plan d'action"
							leftSection={<MapPinned size="1rem" />}
							active={pathname === "/plan-d-action"}
							onClick={() => {
								navigate(AnchorsKeys.PLAN_D_ACTION);
							}}
						/>

						<Button fullWidth onClick={toggle} variant="light">
							{!opened ? "Afficher" : "Masquer"} l&apos;aide
						</Button>
					</div>

					<div className="flex flex-col gap-3">
						<div className="flex gap-3">
							<Group gap={0} className="w-full" align="stretch" wrap="nowrap">
								<Button
									color="green"
									style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
									onClick={() => todocx(prosit, exportFormat)}
								>
									Exporter en .{isExportFormatReady ? exportFormat : DEFAULT_EXPORT_FORMAT}
								</Button>
								<Menu position="bottom-end" withinPortal>
									<Menu.Target>
										<ActionIcon
											color="green"
											variant="filled"
											aria-label="Choisir le format d'export"
											h={36}
											style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, left: 0, flex: 1}}
										>
											<ChevronDown size={16} />
										</ActionIcon>
									</Menu.Target>
									<Menu.Dropdown>
										<Menu.Label>Format par défaut</Menu.Label>
										<Menu.Item onClick={() => setExportFormat("docx")}>
											Exporter en .docx
										</Menu.Item>
										<Menu.Item onClick={() => setExportFormat("pdf")}>
											Exporter en .pdf
										</Menu.Item>
									</Menu.Dropdown>
								</Menu>
							</Group>
							<Tooltip bg="blue" c="white" label="Ouvrir la présentation">
								<Button
									color="blue"
									onClick={async () => {
										if (typeof window === "undefined") return;

										if (!presentationWindow || presentationWindow?.closed) {
											const finalpath = window.location.href.split("/");
											finalpath.pop();
											finalpath.push("presentation");

											// @ts-ignore
											if (window.__TAURI__) {
												const { WebviewWindow } = await import(
													"@tauri-apps/api/window"
												);
												setPresentationWindow(
													new WebviewWindow("Présentation", {
														decorations: false,
														url: finalpath.join("/"),
													}),
												);
												return;
											}

											setPresentationWindow(
												window.open(
													finalpath.join("/"),
													"_blank",
													"popup=true,status=no,location=no,toolbar=no,menubar=no",
												),
											);
										}
									}}
								>
									<MonitorPlay />
								</Button>
							</Tooltip>
						</div>
						<Tooltip
							className={clsx(classes.toggleIcon, classes.toggle)}
							label={"Changer de thème"}
						>
							<Button
								onClick={toggleColorScheme}
								variant="light"
								className={classes.toggle}
							>
								<Sun className={clsx(classes.light, classes.toggleIcon)} />
								<MoonStar className={clsx(classes.dark, classes.toggleIcon)} />
							</Button>
						</Tooltip>
					</div>

					<Button fullWidth variant="subtle" color="red" onClick={open}>
						Réinitialiser le prosit
					</Button>
				</AppShell.Navbar>

				<AppShell.Main>
					<Burger
						opened={openSec}
						onClick={ToggleSec}
						hiddenFrom="md"
						size="md"
						className="absolute right-0 top-0 p-9"
					/>
					<div className="flex justify-between">
						<Button
							leftSection={<ArrowLeft />}
							variant="transparent"
							onClick={previous}
						>
							{AnchorsLabels[previousAnchor]}
						</Button>

						<Button
							rightSection={<ArrowRight />}
							variant="transparent"
							onClick={next}
						>
							{AnchorsLabels[nextAnchor]}
						</Button>
					</div>
					<div className="mt-6 mx-auto md:px-20 md:min-w-[20rem] md:w-2/3 max-w-4xl">
						{children}
						{/* <div className="absolute top-0 right-0 m-9">Suivant</div>
						<div className="absolute top-0 left-0 m-9">Retour</div> */}
					</div>
				</AppShell.Main>

				<AppShell.Aside p="md" className="flex flex-col gap-3 overflow-auto">
					<Title order={2}>Aide</Title>
					<Title order={3}>Vue de présentation</Title>
					<Text>
						La présentation s&apos;ouvre dans une popup qui contient les valeurs
						sous une forme plus lisible pensée pour être projetée.
					</Text>
					<Text>
						Les valeurs sont automatiquement mises à jour et la présentation est
						synchronisée avec le formulaire, l&apos;endroit où vous êtes dans le
						formulaire est mis en évidence dans la présentation.
					</Text>
					<Text>
						Gardez simplement le formulaire sur l&apos;écran de votre pc et la
						présentation sur le projecteur.
					</Text>

					<div className="flex flex-col gap-3 justify-center flex-1">
						<Title order={3}>Raccourcis</Title>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>a</Kbd>
							</div>
							page informations
						</div>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>z</Kbd>
							</div>
							page mots clefs
						</div>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>e</Kbd>
							</div>
							page contraintes
						</div>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>r</Kbd>
							</div>
							page problematiques
						</div>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>t</Kbd>
							</div>
							page pistes de solution
						</div>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>y</Kbd>
							</div>
							page livrables
						</div>
						<div>
							<div>
								<Kbd>alt</Kbd> + <Kbd>shift</Kbd> + <Kbd>u</Kbd>
							</div>
							page plan d&apos;action
						</div>
						<div>
							<div>
								<Kbd>ctrl</Kbd> + <Kbd>entrer</Kbd>
							</div>
							pour passer à la page suivante
						</div>
						<div>
							<div>
								<Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>entrer</Kbd>
							</div>
							pour passer à la page precedente
						</div>
						<div>
							<div>
								<Kbd>ctrl</Kbd> + <Kbd>s</Kbd>
							</div>
							pour exporter selon le format par défaut
						</div>
					</div>
					<div>
						<div>
							<Kbd>ctrl</Kbd> + <Kbd>alt</Kbd> + <Kbd>l</Kbd>
						</div>
						pour changer de thème (clair/sombre)
					</div>
				</AppShell.Aside>
			</AppShell>
		</div>
	);
}
