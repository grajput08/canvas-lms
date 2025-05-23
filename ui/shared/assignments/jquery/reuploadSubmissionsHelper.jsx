/*
 * Copyright (C) 2020 - present Instructure, Inc.
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

import $ from 'jquery'
import {useScope as createI18nScope} from '@canvas/i18n'
import '@canvas/jquery/jquery.instructure_forms' // brings in $.fn.formSubmit
import React from 'react'
import {createRoot} from 'react-dom/client'
import {AccessibleContent} from '@instructure/ui-a11y-content'
import {Flex} from '@instructure/ui-flex'
import {Tag} from '@instructure/ui-tag'
import FormattedErrorMessage from '@canvas/assignments/react/FormattedErrorMessage'

const I18n = createI18nScope('assignment!reupload_submissions_helper')

const formId = 're_upload_submissions_form'

function beforeSubmit({submissions_zip: submissionsZip}) {
  if (!submissionsZip || !submissionsZip.match(/\.zip$/)) {
    return false
  }

  const submitButton = this.find('button[type="submit"]')
  submitButton.prop('disabled', true)
  submitButton.text(I18n.t('Uploading...'))

  return true
}

function success(attachment) {
  const $form = $(`#${formId}`)
  // We've already posted the file data to files#create_pending and have an
  // attachment that points to the file. That means we no longer need the
  // submissions_zip input, and we need to add an input with the attachment ID.
  $form.find('input[name="submissions_zip"]').remove()
  $form.removeAttr('enctype')
  // xsslint safeString.property id
  $form.append(`<input type="hidden" name="attachment_id" value="${attachment.id}">`)
  // Now that we've generated an attachment and included its ID in the form, submit the form
  // "normally" (don't trigger jQuery submit) to POST to gradebooks#submissions_zip_upload.
  document.getElementById(formId).submit()
}

function error(_data) {
  const submitButton = this.find('button[type="submit"]')
  submitButton.prop('disabled', false)
  submitButton.text(I18n.t('Upload Files'))
  return this
}

function errorFormatter(_error) {
  return {errorMessage: I18n.t('Upload error. Please try again.')}
}

export function setupSubmitHandler(userAssetString) {
  const chooseFileButton = document.getElementById('choose_file_button')
  const fileInput = document.querySelector('input[name="submissions_zip"]')
  const uploadFilesButton = document.getElementById('reuploaded_submissions_button')
  const uploadedFileTagContainer = document.getElementById('uploaded_file_tag')
  let fileRoot

  chooseFileButton?.addEventListener('click', _event => {
    fileInput.click()
  })

  fileInput?.addEventListener('change', event => {
    const files = event.target.files
    if (files.length > 0) {
      chooseFileButton.style.display = 'none'
      uploadFilesButton.style.display = ''
      const removeFile = () => {
        fileRoot.unmount()
        fileInput.value = ''
        chooseFileButton.style.display = ''
        uploadFilesButton.style.display = 'none'
      }
      if (uploadedFileTagContainer) {
        const fileName = files[0].name
        const isZip = fileName.match(/\.zip$/)
        fileRoot = createRoot(uploadedFileTagContainer)
        fileRoot.render(
          <Flex direction="column" margin="0 0 small 0">
            <Flex.Item>
              <Tag
                text={<AccessibleContent alt={fileName}>{fileName}</AccessibleContent>}
                dismissible={true}
                onClick={removeFile}
              />
            </Flex.Item>
            {!isZip && (
              <FormattedErrorMessage
                message={I18n.t('File type must be .zip')}
                margin="xx-small 0 0 0"
                iconMargin="0 xx-small xxx-small 0"
              />
            )}
          </Flex>,
        )
      }
    }
  })

  const options = {
    fileUpload: true,
    fileUploadOptions: {
      context_code: userAssetString,
      formDataTarget: 'uploadDataUrl',
      intent: 'submissions_zip_upload',
      preparedFileUpload: true,
      singleFile: true,
      upload_only: true,
      preferFileValueForInputName: false,
    },
    object_name: 'attachment',
    beforeSubmit,
    error,
    errorFormatter,
    success,
  }

  $(`#${formId}`).formSubmit(options)

  return options
}
