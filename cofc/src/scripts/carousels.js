import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Draggable);
gsap.registerPlugin(InertiaPlugin);
gsap.registerPlugin(Observer);

document.querySelectorAll('.carousel_contain').forEach((container) => {
	const slidesContainer = container.querySelector(".carousel_slides");
	const slides = gsap.utils.toArray(container.querySelectorAll(".carousel_slide"));
	const progressBar = container.querySelector('.carousel_progress_bar');
	const dots = container.querySelector('.carousel_progress_dots');
	let activeElement;
	dots.innerHTML = ''; // Clear any existing dots

	slides.forEach((_, i) => {
		const dot = document.createElement('div');
		dot.classList.add('carousel_progress_dot');
		dot.addEventListener('click', () => loop.toIndex(i, { duration: 0.8, ease: "power1.inOut" }));
		dots.appendChild(dot);
	});
	const dotsArray = Array.from(dots.children);

	const loop = horizontalLoop(slides, {
		paused: true,
		draggable: true,
		center: true,
		onChange: (element, index) => {
			if (activeElement) {
				gsap.to(activeElement, { y: 0, duration: 0.4, ease: "power2.out" });
				activeElement.classList.remove("active");
			}
			// gsap.to(element, { y: "-1rem", duration: 0.4, ease: "power2.out" });
			element.classList.add("active");
			activeElement = element;

			gsap.to(progressBar, {
				width: `${(index / (slides.length - 1)) * 100}%`,
				duration: 1,
				ease: "expo.out",
			});

			dotsArray.forEach((dot, i) => {
				if (i === index) {
					dot.classList.add('active');
					gsap.to(dot, { scale: 1.25, duration: 0.3, ease: "power2.out" });
				} else {
					dot.classList.remove('active');
					gsap.to(dot, { scale: 1, duration: 0.3, ease: "power2.out" });
				}
			});
		}
	});

	loop.toIndex(0, {duration: 0});

	slides.forEach((slide, i) => slide.addEventListener("click", () => loop.toIndex(i, {duration: 0.8, ease: "power1.inOut"})));

	container.querySelector(".next").addEventListener("click", () => loop.next({duration: 0.4, ease: "power1.inOut"}));
	container.querySelector(".prev").addEventListener("click", () => loop.previous({duration: 0.4, ease: "power1.inOut"}));
});

function horizontalLoop(items, config) {
	let timeline;
	items = gsap.utils.toArray(items);
	config = config || {};
	gsap.context(() => { // use a context so that if this is called from within another context or a gsap.matchMedia(), we can perform proper cleanup like the "resize" event handler on the window
		let onChange = config.onChange,
			lastIndex = 0,
			tl = gsap.timeline({repeat: config.repeat, onUpdate: onChange && function() {
					let i = tl.closestIndex();
					if (lastIndex !== i) {
						lastIndex = i;
						onChange(items[i], i);
					}
				}, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
			length = items.length,
			startX = items[0].offsetLeft,
			times = [],
			widths = [],
			spaceBefore = [],
			xPercents = [],
			curIndex = 0,
			indexIsDirty = false,
			center = config.center,
			pixelsPerSecond = (config.speed || 1) * 100,
			snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
			timeOffset = 0,
			container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
			totalWidth,
			getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
			populateWidths = () => {
				let b1 = container.getBoundingClientRect(), b2;
				items.forEach((el, i) => {
					widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
					xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
					b2 = el.getBoundingClientRect();
					spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
					b1 = b2;
				});
				gsap.set(items, { // convert "x" to "xPercent" to make things responsive, and populate the widths/xPercents Arrays to make lookups faster.
					xPercent: i => xPercents[i]
				});
				totalWidth = getTotalWidth();
			},
			timeWrap,
			populateOffsets = () => {
				timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
				center && times.forEach((t, i) => {
					times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
				});
			},
			getClosest = (values, value, wrap) => {
				let i = values.length,
					closest = 1e10,
					index = 0, d;
				while (i--) {
					d = Math.abs(values[i] - value);
					if (d > wrap / 2) {
						d = wrap - d;
					}
					if (d < closest) {
						closest = d;
						index = i;
					}
				}
				return index;
			},
			populateTimeline = () => {
				let i, item, curX, distanceToStart, distanceToLoop;
				tl.clear();
				for (i = 0; i < length; i++) {
					item = items[i];
					curX = xPercents[i] / 100 * widths[i];
					distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
					distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
					tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
						.fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
						.add("label" + i, distanceToStart / pixelsPerSecond);
					times[i] = distanceToStart / pixelsPerSecond;
				}
				timeWrap = gsap.utils.wrap(0, tl.duration());
			},
			refresh = (deep) => {
				let progress = tl.progress();
				tl.progress(0, true);
				populateWidths();
				deep && populateTimeline();
				populateOffsets();
				deep && tl.draggable && tl.paused() ? tl.time(times[curIndex], true) : tl.progress(progress, true);
			},
			onResize = () => refresh(true),
			proxy;
		gsap.set(items, {x: 0});
		populateWidths();
		populateTimeline();
		populateOffsets();
		window.addEventListener("resize", onResize);
		function toIndex(index, vars) {
			vars = vars || {};
			(Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
			let newIndex = gsap.utils.wrap(0, length, index),
				time = times[newIndex];
			if (time > tl.time() !== index > curIndex && index !== curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
				time += tl.duration() * (index > curIndex ? 1 : -1);
			}
			if (time < 0 || time > tl.duration()) {
				vars.modifiers = {time: timeWrap};
			}
			curIndex = newIndex;
			vars.overwrite = true;
			gsap.killTweensOf(proxy);    
			return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
		}
		tl.toIndex = (index, vars) => toIndex(index, vars);
		tl.closestIndex = setCurrent => {
			let index = getClosest(times, tl.time(), tl.duration());
			if (setCurrent) {
				curIndex = index;
				indexIsDirty = false;
			}
			return index;
		};
		tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
		tl.next = vars => toIndex(tl.current()+1, vars);
		tl.previous = vars => toIndex(tl.current()-1, vars);
		tl.times = times;
		tl.progress(1, true).progress(0, true); // pre-render for performance
		if (config.reversed) {
			tl.vars.onReverseComplete();
			tl.reverse();
		}
		if (config.draggable && typeof(Draggable) === "function") {
			proxy = document.createElement("div")
			let wrap = gsap.utils.wrap(0, 1),
				ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
				align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
				syncIndex = () => tl.closestIndex(true);
			typeof(InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
			draggable = Draggable.create(proxy, {
				trigger: items[0].parentNode,
				type: "x",
				onPressInit() {
					let x = this.x;
					gsap.killTweensOf(tl);
					wasPlaying = !tl.paused();
					tl.pause();
					startProgress = tl.progress();
					refresh();
					ratio = 0.8 / totalWidth; // Changes how fast the slides move on drag
					initChangeX = (startProgress / -ratio) - x;
					gsap.set(proxy, {x: startProgress / -ratio});
				},
				onDrag: align,
				onThrowUpdate: align,
				overshootTolerance: 0,
				inertia: true,
				snap(value) {
					//note: if the user presses and releases in the middle of a throw, due to the sudden correction of proxy.x in the onPressInit(), the velocity could be very large, throwing off the snap. So sense that condition and adjust for it. We also need to set overshootTolerance to 0 to prevent the inertia from causing it to shoot past and come back
					if (Math.abs(startProgress / -ratio - this.x) < 10) {
						return lastSnap + initChangeX
					}
					let time = -(value * ratio) * tl.duration(),
						wrappedTime = timeWrap(time),
						snapTime = times[getClosest(times, wrappedTime, tl.duration())],
						dif = snapTime - wrappedTime;
					Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
					lastSnap = (time + dif) / tl.duration() / -ratio;
					return lastSnap;
				},
				onRelease() {
					syncIndex();
					draggable.isThrowing && (indexIsDirty = true);
				},
				onThrowComplete: () => {
					syncIndex();
					wasPlaying && tl.play();
				}
			})[0];
			tl.draggable = draggable;
		}
		tl.closestIndex(true);
		lastIndex = curIndex;
		onChange && onChange(items[curIndex], curIndex);
		timeline = tl;
		return () => window.removeEventListener("resize", onResize); // cleanup
	});
	return timeline;
}