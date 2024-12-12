import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useConfig, useItemInfo, useEnvironmentId, useVariantInfo, useValue } from './customElement/CustomElementContext';
import { useElements } from './customElement/selectors';
import { DeliveryClient } from '@kontent-ai/delivery-sdk';
import { Config } from './customElement/config';
import { useDebouncedCallback } from 'use-debounce';
import { Loader } from './customElement/Loader';
import { sections } from "./integrationApp.module.css";

export const IntegrationApp = () => {
  const [elementValue, setElementValue] = useValue();
  const config = useConfig();
  const environmentId = useEnvironmentId();
  const item = useItemInfo();
  const variant = useVariantInfo();

  const [foundIssues, setFoundIssues] = useState<ReadonlyMap<string, ReadonlyArray<Issue>> | null>(null);

  const deliveryClient = useMemo(() =>
    new DeliveryClient({ environmentId, previewApiKey: config.previewApiKey, defaultQueryConfig: { usePreviewMode: true, waitForLoadingNewContent: true } })
    , [environmentId, config.previewApiKey]);

  const watchedElements = useElements(config.elementsCodenames);

  const updateIssues = useDebouncedCallback(() =>
    deliveryClient
      .item(item.codename)
      .languageParameter(variant.codename)
      .elementsParameter([...config.elementsCodenames])
      .toPromise()
      .then(response => Object.entries(response.data.item.elements))
      .then(elements => setFoundIssues(new Map(elements.map(([codename, value]) => [codename, validateElement(value.value, config)])))),
    4000);

  useEffect(() => {
    if (!watchedElements) {
      return;
    }

    setFoundIssues(null);
    updateIssues();
  }, [watchedElements, updateIssues]);

  useDynamicHeight(foundIssues);

  const issues = useMemo(() => [...foundIssues?.entries() ?? []].filter(issues => issues[1].length > 0), [foundIssues]);

  if (foundIssues === null) {
    return <Loader />;
  }

  if (issues.length === 0) {
    setElementValue("No issues found");
  }
  else {  
    setElementValue(null);
  }


  return (
    <div style={{ paddingTop: 10 }}>
      {issues.length > 0 ? <FoundIssues issues={issues} /> : <h1>{elementValue}</h1>}
    </div>
  );
};

IntegrationApp.displayName = 'IntegrationApp';

const FoundIssues = ({ issues }: { issues: ReadonlyArray<readonly [string, ReadonlyArray<Issue>]> }) => (
  <>
    <h1>Found heading issues</h1>
    <div className={sections}>
      {issues.map(([codename, issues]) => (
        <section key={codename} className="section">
          <h2>{codename}</h2>
          {issues.map((issue, index) => (
            <p key={index} className={`section info ${issue.type === "error" ? "red" : "orange"}`}>
              {issue.message}
            </p>
          ))}
        </section>
      ))}
    </div>
  </>
);


type Issue = Readonly<{
  type: 'error' | 'warning';
  message: JSX.Element;
}>;

const validateElement = (elementValue: string | null, config: Config): ReadonlyArray<Issue> => {
  if (!elementValue) {
    return [];
  }

  const element = document.createElement("div");
  element.innerHTML = elementValue;
  const headings = [...element.querySelectorAll('h1, h2, h3, h4, h5, h6').values()];

  const headingOrderIssues = headings.reduce<ValidateElementAccumulator>(checkHeading, { issues: [], previousHeadingLevel: config.startingLevel ?? 0, previousElement: null });

  return [
    ...headings.filter(h => getElementHeadingLevel(h) === 1).length > 1
      ? [{ type: 'warning' as const, message: <p>There should be only one <b>h1</b> element on a page. See <a href='https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#avoid_using_multiple_h1_elements_on_one_page'>https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#avoid_using_multiple_h1_elements_on_one_page</a> for more details</p> }]
      : [],
    ...headingOrderIssues.issues,
  ];
};

type ValidateElementAccumulator = Readonly<{
  issues: ReadonlyArray<Issue>;
  previousHeadingLevel: number;
  previousElement: Element | null;
}>;

const checkHeading = (acc: ValidateElementAccumulator, element: Element): ValidateElementAccumulator => {
  const { issues, previousHeadingLevel, previousElement } = acc;
  const headingLevel = getElementHeadingLevel(element);
  if (!headingLevel) {
    return acc;
  }

  return headingLevel - previousHeadingLevel > 1
    ? { issues: [...issues, { type: 'error', message: createLevelTooLowErrorMessage(previousElement, element, previousHeadingLevel + 1) }], previousHeadingLevel: headingLevel, previousElement: element }
    : { ...acc, previousHeadingLevel: headingLevel, previousElement: element };
};

const headingTagRegex = /^h([1-6])$/i;

const getElementHeadingLevel = (element: Element): number | null => {
  const match = headingTagRegex.exec(element.tagName)?.[1];
  if (!match) {
    return null;
  }
  return parseInt(match, 10);
}

const createLevelTooLowErrorMessage = (previousElement: Element | null, currentElement: Element, expectedHeading: number): JSX.Element => {
  const prevElementReference = previousElement
    ? <>follow <b>h{getElementHeadingLevel(previousElement)}</b> "{previousElement.textContent}".</>
    : <>be at the top-level of the element.</>;

  return (
    <>
      <p>Heading <b>h{getElementHeadingLevel(currentElement)}</b> "{currentElement.textContent}" cannot {prevElementReference}</p>
      <p>Use <b>h{expectedHeading}</b> instead.</p>
    </>
  );
};

const useDynamicHeight = (renderedData: unknown) => {
  useLayoutEffect(() => {
    const newSize = Math.max(document.documentElement.offsetHeight, 100);

    CustomElement.setHeight(Math.ceil(newSize));
  }, [renderedData]); // recalculate the size when the rendered data changes
};
