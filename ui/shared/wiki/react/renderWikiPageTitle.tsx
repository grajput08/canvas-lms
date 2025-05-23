/*
 * Copyright (C) 2023 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useEffect, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {TextInput} from '@instructure/ui-text-input'
import type {TextInputProps} from '@instructure/ui-text-input'
import {Text} from '@instructure/ui-text'
import {View} from '@instructure/ui-view'
import {Heading} from '@instructure/ui-heading'
import type {FormMessage} from '@instructure/ui-form-field'
import {useScope as createI18nScope} from '@canvas/i18n'
import type JQuery from 'jquery'
import type WikiPageEditView from '../backbone/views/WikiPageEditView'
import {checkForTitleConflictDebounced} from '../utils/titleConflicts'

const I18n = createI18nScope('pages_edit_title')

interface ComponentProps {
  canEdit: boolean
  isContentLocked: boolean
  viewElement: JQuery<HTMLFormElement> & WikiPageEditView
  validationCallback: (data: Record<string, unknown>) => ValidationResult
}

interface FormDataError {
  message: string
  type: string
}

interface ValidationResult {
  [k: string]: FormDataError[]
}

export type Props = TextInputProps & ComponentProps

const EditableContent = (props: Props) => {
  const [messages, setMessages] = useState<FormMessage[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleSubmit = (evt?: JQuery.SubmitEvent) => {
      evt?.stopPropagation()

      const data = props.viewElement.getFormData<Record<string, unknown>>()
      const dataErrors = props.validationCallback(data)
      const titleErrors = dataErrors?.title || []
      if (titleErrors.length > 0) {
        const parsedErrors: FormMessage[] = titleErrors.map((error: FormDataError) => ({
          text: error.message,
          type: 'newError',
        }))
        setMessages(parsedErrors)
        return false
      }
      else {
        // we show errors from the server if any
        evt?.result.catch((error: any) => {
          const titleError = error.responseJSON.errors.title[0]
          if (titleError) {
            setMessages([{text: titleError.message, type: 'newError'}])
            setTimeout(() => inputRef.current?.focus(), 200)
            return false
          }
        })
      }
    }

    if (inputRef.current !== null) {
      // The generated input element must have the name "title" to be
      // included in the current submission process
      inputRef.current.name = 'title'
    }

    props.viewElement.on('submit', handleSubmit)
    return () => {
      props.viewElement.off('submit', handleSubmit)
    }
  }, [props, inputRef])

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = e.target
    if (value === props.defaultValue || value.trim().length === 0) {
      setMessages([])
      return
    }
    checkForTitleConflictDebounced(value, setMessages)
  }

  return props.isContentLocked ? (
    <>
      <Heading data-testid="wikipage-locked-title" level="h1">
        {props.defaultValue}
      </Heading>
      <input name="title" type="hidden" value={props.defaultValue} />
    </>
  ) : (
    <View as="div" maxWidth="600px">
      <TextInput
        id="wikipage-title-input"
        data-testid="wikipage-title-input"
        inputRef={(ref: HTMLInputElement | null) => (inputRef.current = ref)}
        messages={messages}
        onChange={handleOnChange}
        renderLabel={() => (
          <Text size="small" weight="normal">
            {I18n.t('Page Title')}
          </Text>
        )}
        {...props}
      />
    </View>
  )
}

const renderWikiPageTitle = (props: Props) => {
  const readOnlyContent = () => {
    return (
      <Heading data-testid="wikipage-readonly-title" level="h2">
        {props.defaultValue}
      </Heading>
    )
  }

  const titleComponent = props.canEdit ? <EditableContent {...props} /> : readOnlyContent()
  const wikiPageTitleContainer = document.getElementById('edit_wikipage_title_container')
  if (wikiPageTitleContainer) {
    const root = createRoot(wikiPageTitleContainer)
    root.render(titleComponent)
  }

  return titleComponent
}

export default renderWikiPageTitle
