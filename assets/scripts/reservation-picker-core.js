export function createReservationPickerCore() {
    const MOBILE_PICKER_QUERY = "(max-width: 720px)";
    const isMobilePicker = () =>
        window.matchMedia(MOBILE_PICKER_QUERY).matches;

    const pickerBackdrop = document.createElement("div");
    pickerBackdrop.className = "reservas-picker-backdrop";
    pickerBackdrop.hidden = true;
    document.body.append(pickerBackdrop);

    let activePickerClose = null;
    let activePickerRefresh = null;
    let modalPickerClose = null;

    const activatePicker = (close, refresh = null) => {
        if (activePickerClose && activePickerClose !== close) {
            activePickerClose();
        }

        activePickerClose = close;
        activePickerRefresh = refresh;

        if (isMobilePicker()) {
            modalPickerClose = close;
            pickerBackdrop.hidden = false;
            document.body.classList.add("has-picker-modal");
        }
    };

    const deactivatePicker = (close) => {
        if (activePickerClose === close) {
            activePickerClose = null;
            activePickerRefresh = null;
        }

        if (modalPickerClose === close) {
            modalPickerClose = null;
            pickerBackdrop.hidden = true;
            document.body.classList.remove("has-picker-modal");
        }
    };

    pickerBackdrop.addEventListener("pointerdown", (event) => {
        event.preventDefault();

        if (activePickerClose) {
            activePickerClose({ focus: true });
        }
    });

    window.addEventListener("resize", () => {
        if (activePickerClose) {
            activePickerClose();
        }
    });

    window.addEventListener(
        "scroll",
        () => {
            if (activePickerRefresh) {
                activePickerRefresh();
            }
        },
        { passive: true },
    );

    const createIcon = (name, className = "") => {
        const icon = document.createElement("span");
        icon.className = `icon${className ? ` ${className}` : ""}`;
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = name;
        return icon;
    };

    const getLabelText = (label) => {
        if (!label) return "";

        const clone = label.cloneNode(true);
        clone
            .querySelectorAll(
                ".reservas-form__required, .reservas-form__optional",
            )
            .forEach((element) => element.remove());

        return clone.textContent.replace(/\s+/g, " ").trim();
    };

    const getFieldLabelId = (label, native) => {
        if (!label) return "";

        if (!label.id) {
            label.id = `${native.id}-label`;
        }

        return label.id;
    };

    const getDescribedBy = (native) => {
        const error = document.getElementById(
            `${native.id}-error`,
        );

        return [native.getAttribute("aria-describedby"), error?.id]
            .filter(Boolean)
            .filter((id, index, ids) => ids.indexOf(id) === index)
            .join(" ");
    };

    const createPickerHeader = (titleText, onClose) => {
        const header = document.createElement("div");
        header.className = "reservas-picker__header";

        const title = document.createElement("p");
        title.className = "reservas-picker__title";
        title.textContent = titleText;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "reservas-picker__close";
        closeButton.setAttribute("aria-label", "Cerrar");
        closeButton.append(createIcon("close"));
        closeButton.addEventListener("click", onClose);

        header.append(title, closeButton);

        return { header, closeButton };
    };

    const createPickerShell = (panel, titleText, onClose) => {
        const shell = document.createElement("div");
        shell.className = "reservas-picker__shell";

        const { header, closeButton } = createPickerHeader(
            titleText,
            onClose,
        );

        shell.append(header, panel);

        return { shell, closeButton };
    };

    const positionPickerPanel = (
        wrapper,
        trigger,
        panel,
        maxHeight = 256,
    ) => {
        if (isMobilePicker()) {
            wrapper.classList.remove("is-up");
            panel.style.maxHeight = "";
            return;
        }

        panel.style.maxHeight = "";

        const triggerRect = trigger.getBoundingClientRect();
        const panelHeight = panel.offsetHeight;
        const safeMargin = 24;
        const gap = 8;
        const header = document.querySelector(".site-header");
        const headerBottom = header
            ? header.getBoundingClientRect().bottom
            : 0;
        const topLimit = Math.max(16, headerBottom + 12);
        const spaceBelow =
            window.innerHeight -
            triggerRect.bottom -
            safeMargin -
            gap;
        const spaceAbove =
            triggerRect.top - topLimit - gap;
        const openUp =
            spaceBelow < panelHeight && spaceAbove > spaceBelow;

        wrapper.classList.toggle("is-up", openUp);
        panel.style.maxHeight = `${Math.max(
            140,
            Math.min(maxHeight, openUp ? spaceAbove : spaceBelow),
        )}px`;
    };

    const keepFocusedInPanel = (panel) => {
        const active = document.activeElement;

        if (!active || !panel.contains(active)) return;

        const activeRect = active.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const padding = 8;

        if (activeRect.top < panelRect.top + padding) {
            panel.scrollTop -=
                panelRect.top + padding - activeRect.top;
        } else if (
            activeRect.bottom >
            panelRect.bottom - padding
        ) {
            panel.scrollTop +=
                activeRect.bottom - (panelRect.bottom - padding);
        }
    };

    const trapMobilePickerFocus = (shell) => {
        shell.addEventListener("keydown", (event) => {
            if (event.key !== "Tab" || !isMobilePicker()) return;

            const focusables = Array.from(
                shell.querySelectorAll("button:not(:disabled)"),
            ).filter((element) => element.offsetParent !== null);

            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        });
    };

    const createPickerTrigger = (
        native,
        label,
        describedBy,
        titleText,
    ) => {
        const valueId = `${native.id}-value`;
        const panelId = `${native.id}-panel`;
        const labelId = getFieldLabelId(label, native);

        const button = document.createElement("button");
        button.type = "button";
        button.id = `${native.id}-button`;
        button.className =
            "reservas-form__input reservas-picker__button";
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", panelId);

        if (native.required) {
            button.setAttribute("aria-required", "true");
        }

        if (describedBy) {
            button.setAttribute("aria-describedby", describedBy);
        }

        if (labelId) {
            button.setAttribute(
                "aria-labelledby",
                `${labelId} ${valueId}`,
            );
        } else {
            button.setAttribute("aria-label", titleText);
        }

        const value = document.createElement("span");
        value.className = "reservas-picker__value";
        value.id = valueId;

        const chevron = createIcon(
            "expand_more",
            "reservas-picker__chevron",
        );

        button.append(value, chevron);

        return { button, value, panelId };
    };

    return {
    isMobilePicker,
    activatePicker,
    deactivatePicker,
    createIcon,
    getLabelText,
    getFieldLabelId,
    getDescribedBy,
    createPickerShell,
    positionPickerPanel,
    keepFocusedInPanel,
    trapMobilePickerFocus,
    createPickerTrigger,
    };
}
